import React, { useState } from 'react';
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink, Check } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

/**
 * WalletButton - Wallet connection button with dropdown menu
 */
function WalletButton() {
    const {
        wallet,
        chain,
        connected,
        connecting,
        shortAddress,
        connect,
        connectPhantom,
        connectMetaMask,
        disconnect,
        phantomAvailable,
        metaMaskAvailable,
        error
    } = useWallet();

    const [showDropdown, setShowDropdown] = useState(false);
    const [showWalletSelect, setShowWalletSelect] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyAddress = () => {
        if (wallet) {
            navigator.clipboard.writeText(wallet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleConnect = (preferredChain) => {
        setShowWalletSelect(false);
        if (preferredChain === 'solana') {
            connectPhantom();
        } else if (preferredChain === 'evm') {
            connectMetaMask();
        } else {
            connect();
        }
    };

    // Connected state - show address with dropdown
    if (connected && wallet) {
        return (
            <div className="relative">
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 
                     rounded-xl font-medium text-white hover:opacity-90 transition-all shadow-lg"
                >
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span>{shortAddress}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDropdown && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowDropdown(false)}
                        />
                        <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-purple-500/30 
                            rounded-xl shadow-2xl z-50 overflow-hidden">
                            {/* Chain badge */}
                            <div className="px-4 py-3 border-b border-slate-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400">Connected to</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                    ${chain === 'solana' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {chain === 'solana' ? '◎ Solana' : '⟠ Ethereum'}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-2">
                                <button
                                    onClick={handleCopyAddress}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-300 
                             hover:bg-slate-700/50 rounded-lg transition-colors"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    <span>{copied ? 'Copied!' : 'Copy Address'}</span>
                                </button>

                                <a
                                    href={chain === 'solana'
                                        ? `https://solscan.io/account/${wallet}`
                                        : `https://etherscan.io/address/${wallet}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-300 
                             hover:bg-slate-700/50 rounded-lg transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span>View on Explorer</span>
                                </a>

                                <hr className="my-2 border-slate-700" />

                                <button
                                    onClick={() => {
                                        disconnect();
                                        setShowDropdown(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-red-400 
                             hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Disconnect</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Not connected - show connect button
    return (
        <div className="relative">
            <button
                onClick={() => setShowWalletSelect(!showWalletSelect)}
                disabled={connecting}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 
                   rounded-xl font-medium text-white hover:opacity-90 transition-all shadow-lg
                   disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Wallet className="w-4 h-4" />
                <span>{connecting ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>

            {showWalletSelect && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowWalletSelect(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-purple-500/30 
                          rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="p-3 border-b border-slate-700">
                            <h3 className="text-white font-medium">Select Wallet</h3>
                            <p className="text-xs text-gray-400 mt-1">Choose your wallet provider</p>
                        </div>

                        <div className="p-2">
                            {/* Phantom (Solana) */}
                            <button
                                onClick={() => handleConnect('solana')}
                                disabled={!phantomAvailable}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all
                  ${phantomAvailable
                                        ? 'hover:bg-purple-500/20 text-white'
                                        : 'opacity-50 cursor-not-allowed text-gray-500'}`}
                            >
                                <img
                                    src="https://phantom.app/img/phantom-logo.svg"
                                    alt="Phantom"
                                    className="w-8 h-8"
                                    onError={(e) => { e.target.src = ''; e.target.alt = '👻'; }}
                                />
                                <div className="text-left">
                                    <p className="font-medium">Phantom</p>
                                    <p className="text-xs text-gray-400">
                                        {phantomAvailable ? 'Solana Wallet' : 'Not installed'}
                                    </p>
                                </div>
                                {phantomAvailable && (
                                    <span className="ml-auto px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                                        Solana
                                    </span>
                                )}
                            </button>

                            {/* MetaMask (EVM) */}
                            <button
                                onClick={() => handleConnect('evm')}
                                disabled={!metaMaskAvailable}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all
                  ${metaMaskAvailable
                                        ? 'hover:bg-orange-500/20 text-white'
                                        : 'opacity-50 cursor-not-allowed text-gray-500'}`}
                            >
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                                    alt="MetaMask"
                                    className="w-8 h-8"
                                    onError={(e) => { e.target.src = ''; e.target.alt = '🦊'; }}
                                />
                                <div className="text-left">
                                    <p className="font-medium">MetaMask</p>
                                    <p className="text-xs text-gray-400">
                                        {metaMaskAvailable ? 'Ethereum & L2s' : 'Not installed'}
                                    </p>
                                </div>
                                {metaMaskAvailable && (
                                    <span className="ml-auto px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                        EVM
                                    </span>
                                )}
                            </button>

                            {(!phantomAvailable && !metaMaskAvailable) && (
                                <p className="px-3 py-2 text-sm text-gray-400 text-center">
                                    No wallet detected. Install{' '}
                                    <a href="https://phantom.app" target="_blank" rel="noopener noreferrer"
                                        className="text-purple-400 hover:underline">Phantom</a>
                                    {' '}or{' '}
                                    <a href="https://metamask.io" target="_blank" rel="noopener noreferrer"
                                        className="text-orange-400 hover:underline">MetaMask</a>
                                </p>
                            )}
                        </div>

                        {error && (
                            <div className="px-3 py-2 bg-red-500/10 border-t border-red-500/30">
                                <p className="text-xs text-red-400">{error}</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default WalletButton;
