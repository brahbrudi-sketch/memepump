import { useState, useCallback, useEffect } from 'react';

// Wallet Provider Detection
const getPhantomProvider = () => {
    if ('phantom' in window) {
        const provider = window.phantom?.solana;
        if (provider?.isPhantom) {
            return provider;
        }
    }
    return null;
};

const getMetaMaskProvider = () => {
    if (window.ethereum?.isMetaMask) {
        return window.ethereum;
    }
    return null;
};

/**
 * useWallet Hook - Handles wallet connections for Solana (Phantom) and EVM (MetaMask)
 */
export function useWallet() {
    const [wallet, setWallet] = useState(null);
    const [chain, setChain] = useState(null); // 'solana' | 'evm'
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState(null);

    // Check for existing connection on mount
    useEffect(() => {
        const storedWallet = localStorage.getItem('memepump_wallet');
        const storedChain = localStorage.getItem('memepump_chain');

        if (storedWallet && storedChain) {
            setWallet(storedWallet);
            setChain(storedChain);
            setConnected(true);
        }
    }, []);

    // Connect to Phantom (Solana)
    const connectPhantom = useCallback(async () => {
        const provider = getPhantomProvider();

        if (!provider) {
            window.open('https://phantom.app/', '_blank');
            setError('Phantom wallet not installed');
            return null;
        }

        setConnecting(true);
        setError(null);

        try {
            const response = await provider.connect();
            const publicKey = response.publicKey.toString();

            setWallet(publicKey);
            setChain('solana');
            setConnected(true);

            localStorage.setItem('memepump_wallet', publicKey);
            localStorage.setItem('memepump_chain', 'solana');

            return publicKey;
        } catch (err) {
            setError(err.message || 'Failed to connect Phantom');
            return null;
        } finally {
            setConnecting(false);
        }
    }, []);

    // Connect to MetaMask (EVM)
    const connectMetaMask = useCallback(async () => {
        const provider = getMetaMaskProvider();

        if (!provider) {
            window.open('https://metamask.io/', '_blank');
            setError('MetaMask not installed');
            return null;
        }

        setConnecting(true);
        setError(null);

        try {
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            const address = accounts[0];

            setWallet(address);
            setChain('evm');
            setConnected(true);

            localStorage.setItem('memepump_wallet', address);
            localStorage.setItem('memepump_chain', 'evm');

            return address;
        } catch (err) {
            setError(err.message || 'Failed to connect MetaMask');
            return null;
        } finally {
            setConnecting(false);
        }
    }, []);

    // Auto-detect and connect
    const connect = useCallback(async (preferredChain = null) => {
        if (preferredChain === 'solana') {
            return connectPhantom();
        }
        if (preferredChain === 'evm') {
            return connectMetaMask();
        }

        // Auto-detect: prefer Phantom if available
        if (getPhantomProvider()) {
            return connectPhantom();
        }
        if (getMetaMaskProvider()) {
            return connectMetaMask();
        }

        setError('No wallet detected. Install Phantom or MetaMask.');
        return null;
    }, [connectPhantom, connectMetaMask]);

    // Disconnect wallet
    const disconnect = useCallback(async () => {
        if (chain === 'solana') {
            const provider = getPhantomProvider();
            if (provider) {
                await provider.disconnect();
            }
        }

        setWallet(null);
        setChain(null);
        setConnected(false);
        setError(null);

        localStorage.removeItem('memepump_wallet');
        localStorage.removeItem('memepump_chain');
    }, [chain]);

    // Sign a message (for wallet verification)
    const signMessage = useCallback(async (message) => {
        if (!connected || !wallet) {
            throw new Error('Wallet not connected');
        }

        if (chain === 'solana') {
            const provider = getPhantomProvider();
            if (!provider) throw new Error('Phantom not available');

            const encodedMessage = new TextEncoder().encode(message);
            const { signature } = await provider.signMessage(encodedMessage, 'utf8');

            return {
                signature: Buffer.from(signature).toString('base64'),
                message,
                address: wallet
            };
        }

        if (chain === 'evm') {
            const provider = getMetaMaskProvider();
            if (!provider) throw new Error('MetaMask not available');

            const signature = await provider.request({
                method: 'personal_sign',
                params: [message, wallet]
            });

            return {
                signature,
                message,
                address: wallet
            };
        }

        throw new Error('Unknown chain');
    }, [connected, wallet, chain]);

    // Get formatted wallet address for display
    const shortAddress = wallet
        ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}`
        : '';

    // Check if wallets are available
    const phantomAvailable = !!getPhantomProvider();
    const metaMaskAvailable = !!getMetaMaskProvider();

    return {
        wallet,
        chain,
        connected,
        connecting,
        error,
        shortAddress,
        connect,
        connectPhantom,
        connectMetaMask,
        disconnect,
        signMessage,
        phantomAvailable,
        metaMaskAvailable,
    };
}

export default useWallet;
