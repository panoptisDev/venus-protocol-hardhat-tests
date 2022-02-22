const BigNum = require('bignumber.js');
const {
    bnbUnsigned,
    bnbMantissa,
    freezeTime,
    address,
    getBigNumber
} = require('./Utils/BSC');

const ONE_DAY = 24 * 60 * 60;
const ONE_YEAR = 360 * 24 * 60 * 60;
const HALF_YEAR = 180 * 24 * 60 * 60;
const TOTAL_VESTING_TIME = new BigNum(ONE_YEAR);

describe('XVSVesting', () => {
    let root, alice, bob;
    let vrtConversionAddress,
        vrtToken,
        xvsToken, xvsTokenAddress;
    let blockTimestamp;
    let vrtFundingAmount;
    let vrtForMint, xvsTokenMintAmount;
    let xvsVesting, xvsVestingAddress;

    const getAllVestingsOfUser = async (xvsVesting, userAddress) => {
        const numberofVestings = await getNumberOfVestingsOfUser(xvsVesting, userAddress);
        const vestings = [];
        let i = 0;
        for (; i < numberofVestings; i++) {
            const vesting = await call(xvsVesting, "vestings", [userAddress, i]);
            vestings.push(vesting);
        }
        return vestings;
    }

    const getNumberOfVestingsOfUser = async (xvsVesting, userAddress) => {
       return await call (xvsVesting, "getVestingCount", [userAddress]);
    }

    const getTotalVestedAmount = async (xvsVesting, userAddress) => {
        return await call(xvsVesting, "getVestedAmount", [userAddress]);
    }

    const computeVestedAmount = (amount, vestingStartTime, currentTime) => {
        const timeDelta = new BigNum(currentTime).minus(new BigNum(vestingStartTime));
        const multiplier = new BigNum(amount).multipliedBy(timeDelta);
        const result = multiplier.dividedToIntegerBy(TOTAL_VESTING_TIME);
        return result;
    }

    const computeWithdrawableAmount = (amount, vestingStartTime, currentTime, withdrawnAmount) => {

        const currentTimeAsBigNumber = getBigNumber(currentTime);
        const vestingStartTimeAsBigNumber = getBigNumber(vestingStartTime);
        const amountAsBigNumber = getBigNumber(amount);
        const withdrawnAmountAsBigNumber = getBigNumber(withdrawnAmount);

        if (currentTimeAsBigNumber.isLessThanOrEqualTo(vestingStartTimeAsBigNumber)) {
            return 0;
        } else if (currentTimeAsBigNumber.isGreaterThan(vestingStartTimeAsBigNumber.plus(TOTAL_VESTING_TIME))) {
            return amount;
        } else {
            const timeDelta = currentTimeAsBigNumber.minus(vestingStartTimeAsBigNumber);
            const multiplier = amountAsBigNumber.multipliedBy(timeDelta);
            const result = multiplier.dividedToIntegerBy(TOTAL_VESTING_TIME);
            return result > 0 ? result.sub(withdrawnAmountAsBigNumber) : 0;
        }
    }

    const getWithdrawableAmountFromContract = async (xvsVesting, userAddress) => {
        return await call(xvsVesting, "getWithdrawableAmount", [userAddress]);
    }

    const getCurrentTimeFromContract = async (xvsVesting) => {
        return await call(xvsVesting, "getCurrentTime", []);
    }

    const depositXVS = async (xvsVesting, recipient, depositAmount, xvsVestingAddress, vrtConversionAddress, root) => {
        let depositTxn = await send(xvsVesting, 'deposit', [recipient, depositAmount], { from: vrtConversionAddress });
        const currentTimeFromContract = await getCurrentTimeFromContract(xvsVesting);
        expect(depositTxn).toSucceed();
        expect(depositTxn).toHaveLog('XVSVested', {
            recipient: recipient,
            startTime: currentTimeFromContract,
            amount: depositAmount.toFixed(),
            withdrawnAmount: 0
        });
        return depositTxn;
    }

    const withdrawXVS = async (xvsVesting, recipient) => {
        const withdrawTxn = await send(xvsVesting, 'withdraw', [], { from: recipient });
        expect(withdrawTxn).toSucceed();
        return withdrawTxn;
    }

    const getXVSBalance = async (xvs, recipient) => {
        return await call(xvs, "balanceOf", [recipient]);
    }

    beforeEach(async () => {
        [root, alice, bob, vrtConversionAddress, ...accounts] = saddle.accounts;
        blockTimestamp = bnbUnsigned(100);
        await freezeTime(blockTimestamp.toNumber());
        conversionStartTime = blockTimestamp;
        conversionRatioMultiplier = 0.75;
        conversionRatio = getBigNumber(0.75e18);
        vrtTotalSupply = bnbMantissa(2000000000);

        //deploy VRT
        vrtToken = await deploy('VRT', [root]);

        vrtTokenAddress = vrtToken._address;
        vrtForMint = bnbMantissa(200000);
        await send(vrtToken, 'transfer', [root, vrtForMint], { from: root });

        vrtFundingAmount = bnbMantissa(100000);

        // Transfer BEP20 to alice
        await send(vrtToken, 'transfer', [alice, vrtFundingAmount], { from: root });

        // Transfer BEP20 to bob
        await send(vrtToken, 'transfer', [bob, vrtFundingAmount], { from: root });

        //deploy XVS
        xvsToken = await deploy('XVS', [root]);
        xvsTokenAddress = xvsToken._address;

        xvsPerDay = bnbMantissa(10000);
        xvsVesting = await deploy('XVSVestingHarness', [xvsTokenAddress]);
        xvsVestingAddress = xvsVesting._address;

        xvsTokenMintAmount = bnbMantissa(100000);
        await send(xvsToken, 'transfer', [vrtConversionAddress, xvsTokenMintAmount], { from: root });
        await send(xvsVesting, '_setVRTConversion', [vrtConversionAddress], { from: root });
    });

    describe("constructor", () => {

        it("sets vrtConversion Address in XVSVesting", async () => {
            let vrtConversionAddressActual = await call(xvsVesting, "vrtConversionAddress");
            expect(vrtConversionAddressActual).toEqual(vrtConversionAddress);
        });

        it("sets XVS Address in XVSVesting", async () => {
            let xvsAddressActual = await call(xvsVesting, "xvs");
            expect(xvsAddressActual).toEqual(xvsTokenAddress);
        });
    });

    describe("Vest XVS", () => {

        let newBlockTimestamp;

        beforeEach(async () => {
            newBlockTimestamp = blockTimestamp.add(ONE_DAY);
            await freezeTime(newBlockTimestamp.toNumber());
        });

        it("deposit XVS", async () => {
            const depositAmount = bnbMantissa(1000);
            const depositTxn = await depositXVS(xvsVesting, alice, depositAmount, xvsVestingAddress, vrtConversionAddress, root);

            const vestings = await getAllVestingsOfUser(xvsVesting, alice);

            expect(vestings.length).toEqual(1);
            expect(vestings[0].recipient).toEqual(alice);
            expect(getBigNumber(vestings[0].startTime)).toEqual(getBigNumber(newBlockTimestamp));
            expect(getBigNumber(vestings[0].amount)).toEqual(getBigNumber(depositAmount));
            expect(getBigNumber(vestings[0].withdrawnAmount)).toEqual(getBigNumber(0));

            const totalVestedAmount = await getTotalVestedAmount(xvsVesting, alice);
            expect(getBigNumber(totalVestedAmount)).toEqual(getBigNumber(0));
        });

        it("can make multiple Deposits followed by few days of timetravel and assert for withdrawable and vestedAmounts", async () => {
            const depositAmount_1 = bnbMantissa(1000);
            let depositTxn = await depositXVS(xvsVesting, alice, depositAmount_1, xvsVestingAddress, vrtConversionAddress, root);

            let vestings = await getAllVestingsOfUser(xvsVesting, alice);
            let totalNumberOfVestings = await getNumberOfVestingsOfUser(xvsVesting, alice);

            expect(getBigNumber(vestings.length)).toEqual(getBigNumber(totalNumberOfVestings));
            expect(vestings[0].recipient).toEqual(alice);
            expect(getBigNumber(vestings[0].startTime)).toEqual(getBigNumber(newBlockTimestamp));
            expect(getBigNumber(vestings[0].amount)).toEqual(getBigNumber(depositAmount_1));
            expect(getBigNumber(vestings[0].withdrawnAmount)).toEqual(getBigNumber(0));

            newBlockTimestamp = newBlockTimestamp.add(ONE_DAY);
            await freezeTime(newBlockTimestamp.toNumber());

            const depositAmount_2 = bnbMantissa(2000);
            depositTxn = await depositXVS(xvsVesting, alice, depositAmount_2, xvsVestingAddress, vrtConversionAddress, root);

            vestings = await getAllVestingsOfUser(xvsVesting, alice);
            totalNumberOfVestings = await getNumberOfVestingsOfUser(xvsVesting, alice);

            expect(getBigNumber(vestings.length)).toEqual(getBigNumber(totalNumberOfVestings));
            expect(vestings[1].recipient).toEqual(alice);
            expect(getBigNumber(vestings[1].startTime)).toEqual(getBigNumber(newBlockTimestamp));
            expect(getBigNumber(vestings[1].amount)).toEqual(getBigNumber(depositAmount_2));
            expect(getBigNumber(vestings[1].withdrawnAmount)).toEqual(getBigNumber(0));

            let currentTime = await getCurrentTimeFromContract(xvsVesting);

            newBlockTimestamp = newBlockTimestamp.add(ONE_DAY);
            await freezeTime(newBlockTimestamp.toNumber());

            //Assert totalVestedAmount after 2 Vestings and advancement of 1-day after each vesting
            currentTime = await getCurrentTimeFromContract(xvsVesting);

            const totalVestedAmount_1_Computed = computeVestedAmount(depositAmount_1, vestings[0].startTime, newBlockTimestamp);
            const vestedAmount_1_contract = await call(xvsVesting, "computeVestedAmount", [vestings[0].amount, vestings[0].startTime, newBlockTimestamp]);
            expect(getBigNumber(vestedAmount_1_contract)).toEqual(getBigNumber(totalVestedAmount_1_Computed));

            const totalVestedAmount_2_Computed = computeVestedAmount(depositAmount_2, vestings[1].startTime, newBlockTimestamp);
            const vestedAmount_2_contract = await call(xvsVesting, "computeVestedAmount", [vestings[1].amount, vestings[1].startTime, newBlockTimestamp]);
            expect(getBigNumber(vestedAmount_2_contract)).toEqual(getBigNumber(totalVestedAmount_2_Computed));

            const totalVestedAmount_expected = getBigNumber(totalVestedAmount_1_Computed).plus(getBigNumber(totalVestedAmount_2_Computed));
            const totalVestedAmount = await getTotalVestedAmount(xvsVesting, alice);
            expect(getBigNumber(totalVestedAmount)).toEqual(getBigNumber(totalVestedAmount_expected));


            //Assert totalWithdrawableAmount after 2 Vestings and advancement of 1-day after each vesting
            const withdrawableAmount_1_Computed = computeWithdrawableAmount(depositAmount_1, vestings[0].startTime, newBlockTimestamp, vestings[0].withdrawnAmount);
            const withdrawableAmount_1_Response_From_Contract = await call(xvsVesting, "computeWithdrawableAmount", [depositAmount_1, vestings[0].startTime, vestings[0].withdrawnAmount]);
            const withdrawableAmount_1_From_Contract = withdrawableAmount_1_Response_From_Contract.toWithdraw;
            expect(getBigNumber(withdrawableAmount_1_From_Contract)).toEqual(getBigNumber(withdrawableAmount_1_Computed));

            const withdrawableAmount_2_Computed = computeWithdrawableAmount(depositAmount_2, vestings[1].startTime, newBlockTimestamp, vestings[1].withdrawnAmount);
            const withdrawableAmount_2_Response_From_Contract = await call(xvsVesting, "computeWithdrawableAmount", [depositAmount_2, vestings[1].startTime, vestings[1].withdrawnAmount]);
            const withdrawableAmount_2_From_Contract = withdrawableAmount_2_Response_From_Contract.toWithdraw;
            expect(getBigNumber(withdrawableAmount_2_From_Contract)).toEqual(getBigNumber(withdrawableAmount_2_Computed));

            const totalWithdrawableAmount_Expected = getBigNumber(withdrawableAmount_1_Computed).plus(getBigNumber(withdrawableAmount_2_Computed));

            const totalWithdrawableAmountResponse_FromContract = await getWithdrawableAmountFromContract(xvsVesting, alice);
            const totalWithdrawableAmount = totalWithdrawableAmountResponse_FromContract.totalWithdrawableAmount;

            expect(getBigNumber(totalWithdrawableAmount)).toEqual(getBigNumber(totalWithdrawableAmount_Expected));
        });

        it("deposit Zero XVSAmount should Fail with Revert Reason", async () => {
            const depositAmount = bnbMantissa(0);
            await expect(send(xvsVesting, 'deposit', [alice, depositAmount], { from: vrtConversionAddress }))
                .rejects.toRevert("revert Deposit amount must be non-zero");
        });

        it("Fail to deposit XVS by Non-VRTConverter", async () => {
            const depositAmount = bnbMantissa(1000);
            await expect(send(xvsVesting, 'deposit', [alice, depositAmount], { from: root }))
                .rejects.toRevert("revert only VRTConversion Address can call the function");
        });

    });

    describe("Withdraw XVS", () => {

        let newBlockTimestamp;

        beforeEach(async () => {
            newBlockTimestamp = blockTimestamp.add(ONE_DAY);
            await freezeTime(newBlockTimestamp.toNumber());
        });

        it("should be able to withdraw Partially-Vested-XVS", async () => {
            const depositAmount_1 = bnbMantissa(1000);
            await depositXVS(xvsVesting, alice, depositAmount_1, xvsVestingAddress, vrtConversionAddress, root);

            newBlockTimestamp = newBlockTimestamp.add(HALF_YEAR);
            await freezeTime(newBlockTimestamp.toNumber());

            const vestings = await getAllVestingsOfUser(xvsVesting, alice);
            const withdrawnAmount_Expected =
                computeWithdrawableAmount(depositAmount_1, vestings[0].startTime, newBlockTimestamp, vestings[0].withdrawnAmount);
            await send(xvsToken, 'transfer', [xvsVestingAddress, withdrawnAmount_Expected], { from: root });

            const xvs_balance_before_withdraw = await getXVSBalance(xvsToken, alice);

            const withdrawTxn = await withdrawXVS(xvsVesting, alice);

            const xvs_balance_after_withdraw = await getXVSBalance(xvsToken, alice);

            expect(withdrawTxn).toHaveLog('XVSWithdrawn', {
                recipient: alice,
                amount: withdrawnAmount_Expected.toFixed()
            });

            expect(getBigNumber(xvs_balance_after_withdraw).isGreaterThan(xvs_balance_before_withdraw)).toEqual(true);
            expect(getBigNumber(xvs_balance_after_withdraw)).toEqual(getBigNumber(xvs_balance_before_withdraw).plus(getBigNumber(withdrawnAmount_Expected)));
        });

        it("should be able to withdraw Fully-Vested-XVS", async () => {
            const depositAmount_1 = bnbMantissa(1000);
            await depositXVS(xvsVesting, alice, depositAmount_1, xvsVestingAddress, vrtConversionAddress, root);

            newBlockTimestamp = newBlockTimestamp.add(ONE_YEAR);
            await freezeTime(newBlockTimestamp.toNumber());

            const vestings = await getAllVestingsOfUser(xvsVesting, alice);
            const withdrawnAmount_Expected =
                computeWithdrawableAmount(depositAmount_1, vestings[0].startTime, newBlockTimestamp, vestings[0].withdrawnAmount);
            expect(getBigNumber(withdrawnAmount_Expected)).toEqual(getBigNumber(depositAmount_1));

            await send(xvsToken, 'transfer', [xvsVestingAddress, depositAmount_1], { from: root });

            const xvs_balance_before_withdraw = await getXVSBalance(xvsToken, alice);

            const withdrawTxn = await withdrawXVS(xvsVesting, alice);

            const xvs_balance_after_withdraw = await getXVSBalance(xvsToken, alice);

            expect(withdrawTxn).toHaveLog('XVSWithdrawn', {
                recipient: alice,
                amount: withdrawnAmount_Expected.toFixed()
            });

            expect(getBigNumber(xvs_balance_after_withdraw).isGreaterThan(xvs_balance_before_withdraw)).toEqual(true);
            expect(getBigNumber(xvs_balance_after_withdraw)).toEqual(getBigNumber(xvs_balance_before_withdraw).plus(getBigNumber(withdrawnAmount_Expected)));
            expect(getBigNumber(xvs_balance_after_withdraw)).toEqual(getBigNumber(depositAmount_1));
        });

        it("should be able to withdraw Vested-XVS from multiple deposits", async () => {
            const depositAmount_1 = bnbMantissa(1000);
            await depositXVS(xvsVesting, alice, depositAmount_1, xvsVestingAddress, vrtConversionAddress, root);

            newBlockTimestamp = newBlockTimestamp.add(ONE_YEAR);
            await freezeTime(newBlockTimestamp.toNumber());

            await send(xvsToken, 'transfer', [xvsVestingAddress, depositAmount_1], { from: root });

            const depositAmount_2 = bnbMantissa(2000);
            depositTxn = await depositXVS(xvsVesting, alice, depositAmount_2, xvsVestingAddress, vrtConversionAddress, root);

            newBlockTimestamp = newBlockTimestamp.add(HALF_YEAR);
            await freezeTime(newBlockTimestamp.toNumber());

            const halfAmount_DepositAmount_2 = getBigNumber(depositAmount_2).multipliedBy(getBigNumber(0.5));

            await send(xvsToken, 'transfer', [xvsVestingAddress, halfAmount_DepositAmount_2], { from: root });

            const vestings = await getAllVestingsOfUser(xvsVesting, alice);
            const withdrawableAmount_From_Vesting_1 =
                computeWithdrawableAmount(depositAmount_1, vestings[0].startTime, newBlockTimestamp, vestings[0].withdrawnAmount);
            const withdrawableAmount_From_Vesting_2 =
                computeWithdrawableAmount(depositAmount_2, vestings[1].startTime, newBlockTimestamp, vestings[1].withdrawnAmount);

            const withdrawnAmount_Expected = getBigNumber(withdrawableAmount_From_Vesting_1).plus(getBigNumber(withdrawableAmount_From_Vesting_2));

            const xvs_balance_before_withdraw = await getXVSBalance(xvsToken, alice);

            const withdrawTxn = await withdrawXVS(xvsVesting, alice);

            const xvs_balance_after_withdraw = await getXVSBalance(xvsToken, alice);

            expect(withdrawTxn).toHaveLog('XVSWithdrawn', {
                recipient: alice,
                amount: withdrawnAmount_Expected.toFixed()
            });

            expect(getBigNumber(xvs_balance_after_withdraw).isGreaterThan(xvs_balance_before_withdraw)).toEqual(true);
            expect(getBigNumber(xvs_balance_after_withdraw)).toEqual(getBigNumber(xvs_balance_before_withdraw).plus(getBigNumber(withdrawnAmount_Expected)));
            expect(getBigNumber(xvs_balance_after_withdraw)).toEqual(getBigNumber(depositAmount_1).plus(halfAmount_DepositAmount_2));
        });

        it("Assert for No XVS-Transfer as entire vestedAmount is Withdrawn", async () => {
            const depositAmount_1 = bnbMantissa(1000);
            await depositXVS(xvsVesting, alice, depositAmount_1, xvsVestingAddress, vrtConversionAddress, root);

            newBlockTimestamp = newBlockTimestamp.add(ONE_YEAR);
            await freezeTime(newBlockTimestamp.toNumber());

            const vestings = await getAllVestingsOfUser(xvsVesting, alice);
            const withdrawnAmount_Expected =
                computeWithdrawableAmount(depositAmount_1, vestings[0].startTime, newBlockTimestamp, vestings[0].withdrawnAmount);
            expect(getBigNumber(withdrawnAmount_Expected)).toEqual(getBigNumber(depositAmount_1));
            await send(xvsToken, 'transfer', [xvsVestingAddress, depositAmount_1], { from: root });

            let withdrawTxn = await withdrawXVS(xvsVesting, alice);

            newBlockTimestamp = newBlockTimestamp.add(ONE_DAY);
            const xvs_balance_before_withdraw = await getXVSBalance(xvsToken, alice);
            withdrawTxn = await withdrawXVS(xvsVesting, alice);

            const xvs_balance_after_withdraw = await getXVSBalance(xvsToken, alice);
            expect(withdrawTxn).toSucceed();
            expect(getBigNumber(xvs_balance_before_withdraw)).toEqual(getBigNumber(xvs_balance_after_withdraw));
        });

        it("Fail to withdraw as the recipient doesnot have Vesting records", async () => {
            await expect(withdrawXVS(xvsVesting, bob)).rejects.toRevert("revert recipient doesnot have any vestingRecord");
        });

        it("Fail to withdraw as the XVSVesting has insufficient balance", async () => {
            const depositAmount_1 = bnbMantissa(1000);
            await depositXVS(xvsVesting, alice, depositAmount_1, xvsVestingAddress, vrtConversionAddress, root);

            newBlockTimestamp = newBlockTimestamp.add(ONE_YEAR);
            await freezeTime(newBlockTimestamp.toNumber());

            const vestings = await getAllVestingsOfUser(xvsVesting, alice);
            const withdrawnAmount_Expected =
                computeWithdrawableAmount(depositAmount_1, vestings[0].startTime, newBlockTimestamp, vestings[0].withdrawnAmount);
            expect(getBigNumber(withdrawnAmount_Expected)).toEqual(getBigNumber(depositAmount_1));

            await expect(withdrawXVS(xvsVesting, alice)).rejects.toRevert("revert Insufficient XVS for withdrawal");
        });
    });

    describe('admin()', () => {
        it('should return correct admin', async () => {
            expect(await call(xvsVesting, 'admin')).toEqual(root);
        });
    });

    describe('pendingAdmin()', () => {
        it('should return correct pending admin', async () => {
            expect(await call(xvsVesting, 'pendingAdmin')).toBeAddressZero()
        });
    });

    describe('_setPendingAdmin()', () => {
        it('should only be callable by admin', async () => {
            await expect(send(xvsVesting, '_setPendingAdmin', [accounts[0]], { from: accounts[0] }))
                .rejects.toRevert('revert Only Admin can set the PendingAdmin');

            // Check admin stays the same
            expect(await call(xvsVesting, 'admin')).toEqual(root);
            expect(await call(xvsVesting, 'pendingAdmin')).toBeAddressZero();
        });

        it('should properly set pending admin', async () => {
            expect(await send(xvsVesting, '_setPendingAdmin', [accounts[0]])).toSucceed();

            // Check admin stays the same
            expect(await call(xvsVesting, 'admin')).toEqual(root);
            expect(await call(xvsVesting, 'pendingAdmin')).toEqual(accounts[0]);
        });

        it('should properly set pending admin twice', async () => {
            expect(await send(xvsVesting, '_setPendingAdmin', [accounts[0]])).toSucceed();
            expect(await send(xvsVesting, '_setPendingAdmin', [accounts[1]])).toSucceed();

            // Check admin stays the same
            expect(await call(xvsVesting, 'admin')).toEqual(root);
            expect(await call(xvsVesting, 'pendingAdmin')).toEqual(accounts[1]);
        });

        it('should emit event', async () => {
            const result = await send(xvsVesting, '_setPendingAdmin', [accounts[0]]);
            expect(result).toHaveLog('NewPendingAdmin', {
                oldPendingAdmin: address(0),
                newPendingAdmin: accounts[0],
            });
        });
    });

    describe('_acceptAdmin()', () => {
        it('should fail when pending admin is zero', async () => {
            await expect(send(xvsVesting, '_acceptAdmin')).rejects.toRevert('revert Only PendingAdmin can accept as Admin');

            // Check admin stays the same
            expect(await call(xvsVesting, 'admin')).toEqual(root);
            expect(await call(xvsVesting, 'pendingAdmin')).toBeAddressZero();
        });

        it('should fail when called by another account (e.g. root)', async () => {
            expect(await send(xvsVesting, '_setPendingAdmin', [accounts[0]])).toSucceed();
            await expect(send(xvsVesting, '_acceptAdmin')).rejects.toRevert('revert Only PendingAdmin can accept as Admin');

            // Check admin stays the same
            expect(await call(xvsVesting, 'admin')).toEqual(root);
            expect(await call(xvsVesting, 'pendingAdmin')).toEqual(accounts[0]);
        });

        it('should succeed and set admin and clear pending admin', async () => {
            expect(await send(xvsVesting, '_setPendingAdmin', [accounts[0]])).toSucceed();
            expect(await send(xvsVesting, '_acceptAdmin', [], { from: accounts[0] })).toSucceed();

            // Check admin stays the same
            expect(await call(xvsVesting, 'admin')).toEqual(accounts[0]);
            expect(await call(xvsVesting, 'pendingAdmin')).toBeAddressZero();
        });

        it('should emit log on success', async () => {
            expect(await send(xvsVesting, '_setPendingAdmin', [accounts[0]])).toSucceed();
            const result = await send(xvsVesting, '_acceptAdmin', [], { from: accounts[0] });
            expect(result).toHaveLog('NewAdmin', {
                oldAdmin: root,
                newAdmin: accounts[0],
            });
            expect(result).toHaveLog('NewPendingAdmin', {
                oldPendingAdmin: accounts[0],
                newPendingAdmin: address(0),
            });
        });

    });

});