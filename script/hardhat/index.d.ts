// Governance
export function deployGovernorBravoDelegate(): string { }
export function deployGovernorBravoDelegator(config: { timelockAddress: string, xvsVaultAddress: string, guardianAddress: string, governorBravoDelegateAddress: string }) { }
export function verifyGovernorBravoDelegate() { }
export function verifyGovernorBravoDelegator() { }
export function deployGovernorAlpha(config: { timelockAddress: string, xvsVaultAddress: string, guardianAddress: string }): string { }
export function deployGovernorAlpha2(config: { timelockAddress: string, xvsVaultAddress: string, guardianAddress: string, lastProposalId: number }): string { }

// Vault
export function deployVrtVaultProxy(): string { }
export function deployVrtVault(): string { }
export function deployXvsStore(): string { }
export function deployXvsVaultProxy(): string { }
export function deployXvsVault(): string { }
export function queryVrtVaultViaVaultProxy() { }
export function verifyVrtVaultProxy() { }
export function verifyVrtVault() { }
export function verifyXvsStore() { }
export function verifyXvsVaultProxy() { }
export function verifyXvsVault() { }
export function vrtVaultAcceptAsImplForProxy() { }
export function vrtVaultSetImplForVaultProxy() { }

// Comptroller
export function deployNextComptrollerPrologue(): { vaiControllerContractAddress: string, comptrollerLensContractAddress: string, comptrollerContractAddress: string, liquidatorContractAddress } { }
