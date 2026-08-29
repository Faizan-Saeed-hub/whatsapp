import Close from './icons/Close';

const InstallAppModal = ({ isOpen, onClose, onInstall, isInstallable }) => {
    if (!isOpen) return null;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content install-app-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="install-modal-title">
                        <img src="/wp-icon.png" alt="WhatsApp" className="install-modal-logo" />
                        <div>
                            <h3>Install WhatsApp Web</h3>
                            <span>Add to Mobile Home Screen</span>
                        </div>
                    </div>
                    <button type="button" className="modal-close-btn" onClick={onClose}>
                        <Close />
                    </button>
                </div>

                <div className="install-modal-body">
                    <p className="install-subtitle">
                        Install WhatsApp on your phone or computer for quick access, full-screen standalone mode, and instant notifications!
                    </p>

                    {isInstallable ? (
                        <div className="install-direct-action">
                            <button type="button" className="btn-primary install-now-btn" onClick={onInstall}>
                                📲 Install / Add to Home Screen Now
                            </button>
                        </div>
                    ) : isIOS ? (
                        <div className="ios-install-steps">
                            <div className="install-step-item">
                                <span className="step-num">1</span>
                                <div>Tap the <strong>Share</strong> button (<strong>📤</strong>) in Safari's bottom toolbar.</div>
                            </div>
                            <div className="install-step-item">
                                <span className="step-num">2</span>
                                <div>Scroll down and tap <strong>Add to Home Screen</strong> (<strong>➕</strong>).</div>
                            </div>
                            <div className="install-step-item">
                                <span className="step-num">3</span>
                                <div>Tap <strong>Add</strong> in the top-right corner.</div>
                            </div>
                        </div>
                    ) : (
                        <div className="android-install-steps">
                            <div className="install-step-item">
                                <span className="step-num">1</span>
                                <div>Tap your browser's <strong>3-Dots menu (⋮)</strong> in the top-right.</div>
                            </div>
                            <div className="install-step-item">
                                <span className="step-num">2</span>
                                <div>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</div>
                            </div>
                            <div className="install-step-item">
                                <span className="step-num">3</span>
                                <div>Tap <strong>Install</strong> to add WhatsApp to your home screen!</div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallAppModal;
