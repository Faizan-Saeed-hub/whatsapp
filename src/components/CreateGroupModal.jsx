import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { createDemoGroup } from '../helpers/demoChat';
import Close from './icons/Close';

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated, currentUserEmail, isDemo }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Please enter a group name.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            if (isDemo) {
                const newGroup = createDemoGroup(trimmedName, description.trim(), currentUserEmail || 'user@demo.com');
                setName('');
                setDescription('');
                if (onGroupCreated) onGroupCreated(newGroup);
                onClose();
                return;
            }

            const { data, error: insertError } = await supabase
                .from('groups')
                .insert({
                    name: trimmedName,
                    description: description.trim() || null,
                    created_by: currentUserEmail || 'anonymous'
                })
                .select()
                .single();

            if (insertError) throw insertError;

            setName('');
            setDescription('');
            if (onGroupCreated && data) onGroupCreated(data);
            onClose();
        } catch (err) {
            console.error('Error creating group:', err);
            setError(err.message || 'Failed to create group. Please check database permissions.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Create New Group</h3>
                    <button type="button" className="modal-close-btn" onClick={onClose}>
                        <Close />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="input-group">
                        <label>Group Name *</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Project Team, Family & Friends" 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            maxLength={50}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="input-group">
                        <label>Description / Topic</label>
                        <textarea 
                            placeholder="What is this group about? (Optional)"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            maxLength={160}
                        />
                    </div>

                    {error && <div className="alert-box error">{error}</div>}

                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? "Creating..." : "Create Group"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateGroupModal;
