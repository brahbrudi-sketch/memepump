import React from 'react';
import { Rocket, User, History } from 'lucide-react';
import WalletButton from './WalletButton';

const Header = ({
    currentUser,
    onOpenAuth,
    onOpenSettings,
    onOpenHistory
}) => {
    return (
        <header className="sticky top-0 z-40 backdrop-blur-md bg-black/40 border-b border-purple-900/50 mb-8">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-tr from-purple-600 to-pink-600 p-2 rounded-lg rotate-3 shadow-lg shadow-purple-900/50">
                        <Rocket className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 filter drop-shadow-sm">
                        MEMEPUMP
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    {/* Wallet Connect Button */}
                    <WalletButton />

                    <div className="h-8 w-px bg-purple-800/50 mx-2 hidden sm:block"></div>

                    <div className="flex items-center gap-3">
                        {currentUser && (
                            <div className="hidden md:flex flex-col items-end mr-2">
                                <span className="text-white font-bold text-sm leading-tight">{currentUser.username}</span>
                                <span className="text-purple-400 text-xs">Connected</span>
                            </div>
                        )}

                        <button
                            onClick={currentUser ? onOpenSettings : onOpenAuth}
                            className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition font-bold text-sm sm:text-base ${currentUser
                                ? 'bg-purple-900/50 hover:bg-purple-800 text-purple-200 hover:text-white border border-purple-700'
                                : 'bg-indigo-700 hover:bg-indigo-600 text-white'
                                }`}
                        >
                            <User className="w-5 h-5" />
                            <span className="hidden sm:inline">
                                {currentUser ? (
                                    <span className="max-w-[100px] truncate">{currentUser.username}</span>
                                ) : 'Login'}
                            </span>
                        </button>

                        <button
                            onClick={onOpenHistory}
                            className="p-2 sm:p-3 rounded-lg bg-purple-900/30 hover:bg-purple-800/50 text-purple-300 transition"
                            title="Trade History"
                        >
                            <History className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;

