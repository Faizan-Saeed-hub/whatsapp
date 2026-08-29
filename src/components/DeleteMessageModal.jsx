import Trash from './icons/Trash';

const DeleteMessageModal = ({ 
    isOpen, 
    onClose, 
    isMe, 
    isAdmin, 
    onDeleteForEveryone, 
    onDeleteForMe 
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
                <div className="delete-modal-header">
                    <Trash />
                    <h4>Delete message?</h4>
                </div>
                <p className="delete-modal-desc">
                    You can delete this message for everyone in this chat or only delete it for yourself.
                </p>

                <div className="delete-modal-actions">
                    {(isMe || isAdmin) && (
                        <button 
                            type="button" 
                            className="btn-delete-action danger"
                            onClick={() => {
                                onDeleteForEveryone();
                                onClose();
                            }}
                        >
                            Delete for everyone
                        </button>
                    )}
                    <button 
                        type="button" 
                        className="btn-delete-action"
                        onClick={() => {
                            onDeleteForMe();
                            onClose();
                        }}
                    >
                        Delete for me
                    </button>
                    <button 
                        type="button" 
                        className="btn-delete-action cancel"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteMessageModal;
