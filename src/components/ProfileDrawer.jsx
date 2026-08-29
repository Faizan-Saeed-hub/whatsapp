import { useState, useRef } from 'react';
import Arrow from './icons/Arrow';
import Edit from './icons/Edit';
import Check from './icons/Check';
import Copy from './icons/Copy';
import Camera from './icons/Camera';
import { formatUserTag } from '../helpers/userIdHelper';

import { uploadToCloudinary } from '../helpers/cloudinaryUpload';

const ProfileDrawer = ({ 
    isOpen, 
    onClose, 
    profile, 
    onUpdateProfile 
}) => {
    const [name, setName] = useState(profile?.username || '');
    const [about, setAbout] = useState(profile?.about || 'Hey there! I am using WhatsApp.');
    const [avatarNum, setAvatarNum] = useState(profile?.avatar_num || '0');
    const [customAvatar, setCustomAvatar] = useState(profile?.avatar_url || null);
    
    const [editingName, setEditingName] = useState(false);
    const [editingAbout, setEditingAbout] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);

    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const currentAvatarSrc = customAvatar || `/avatar/avatar-${avatarNum}.jpg`;

    const handleCopyId = () => {
        if (profile?.user_tag) {
            navigator.clipboard.writeText(profile.user_tag);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSaveName = async () => {
        setEditingName(false);
        const updated = { ...profile, username: name.trim() || profile.email.split('@')[0] };
        if (onUpdateProfile) {
            setSaving(true);
            await onUpdateProfile(updated);
            setSaving(false);
        }
    };

    const handleSaveAbout = async () => {
        setEditingAbout(false);
        const updated = { ...profile, about: about.trim() || 'Hey there! I am using WhatsApp.' };
        if (onUpdateProfile) {
            setSaving(true);
            await onUpdateProfile(updated);
            setSaving(false);
        }
    };

    const handleSelectAvatarPreset = async (num) => {
        setAvatarNum(String(num));
        setCustomAvatar(null);
        setShowAvatarPicker(false);
        const updated = { ...profile, avatar_num: String(num), avatar_url: null };
        if (onUpdateProfile) {
            await onUpdateProfile(updated);
        }
    };

    const handleUploadCustomAvatar = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setSaving(true);
            const res = await uploadToCloudinary(file, 'image');
            if (res?.url) {
                setCustomAvatar(res.url);
                setShowAvatarPicker(false);
                const updated = { ...profile, avatar_url: res.url };
                if (onUpdateProfile) {
                    await onUpdateProfile(updated);
                }
            }
        } catch (err) {
            console.error("Avatar upload failed:", err);
        } finally {
            setSaving(false);
            e.target.value = '';
        }
    };

    return (
        <div className="profile-drawer">
            {/* Drawer Header */}
            <div className="drawer-header">
                <button type="button" className="drawer-back-btn" onClick={onClose} title="Back">
                    <Arrow />
                </button>
                <h3>Profile</h3>
            </div>

            <div className="drawer-content">
                {/* Avatar Section */}
                <div className="profile-avatar-section">
                    <div 
                        className="profile-avatar-wrapper"
                        onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                        title="Change profile picture"
                    >
                        <img 
                            src={currentAvatarSrc} 
                            alt="Profile" 
                            className="profile-large-avatar" 
                        />
                        <div className="avatar-camera-overlay">
                            <Camera />
                            <span>CHANGE PROFILE PHOTO</span>
                        </div>
                    </div>

                    {/* Avatar Preset Picker Dropdown */}
                    {showAvatarPicker && (
                        <div className="avatar-picker-modal">
                            <p>Choose an avatar or upload photo:</p>
                            <div className="avatar-presets-grid">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                    <img 
                                        key={num}
                                        src={`/avatar/avatar-${num}.jpg`}
                                        alt={`Preset ${num}`}
                                        className={`preset-thumb ${String(avatarNum) === String(num) && !customAvatar ? 'selected' : ''}`}
                                        onClick={() => handleSelectAvatarPreset(num)}
                                    />
                                ))}
                            </div>
                            <div className="avatar-upload-row">
                                <button 
                                    type="button" 
                                    className="upload-photo-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Upload from Device
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    accept="image/*" 
                                    style={{ display: 'none' }}
                                    onChange={handleUploadCustomAvatar}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 6-Digit ID Card */}
                <div className="drawer-card id-card">
                    <div className="id-card-content">
                        <span className="card-label">Your Unique 6-Digit ID</span>
                        <strong className="id-code">{formatUserTag(profile?.user_tag)}</strong>
                        <small className="card-hint">Share this ID so friends can find & message you</small>
                    </div>
                    <button type="button" className="copy-btn" onClick={handleCopyId}>
                        {copied ? <Check /> : <Copy />}
                        <span>{copied ? "Copied" : "Copy ID"}</span>
                    </button>
                </div>

                {/* Display Name Section */}
                <div className="drawer-card">
                    <span className="card-label">Your name</span>
                    {editingName ? (
                        <div className="edit-field-row">
                            <input 
                                type="text" 
                                value={name} 
                                onChange={e => setName(e.target.value)}
                                maxLength={25}
                                autoFocus
                            />
                            <div className="edit-actions">
                                <small>{25 - name.length}</small>
                                <button type="button" className="save-btn" onClick={handleSaveName}>
                                    <Check />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="view-field-row">
                            <p className="field-value">{profile?.username || profile?.email?.split('@')[0] || 'User'}</p>
                            <button type="button" className="edit-icon-btn" onClick={() => { setName(profile?.username || ''); setEditingName(true); }}>
                                <Edit />
                            </button>
                        </div>
                    )}
                    <small className="card-hint">This name will be visible to your WhatsApp contacts</small>
                </div>

                {/* About Section */}
                <div className="drawer-card">
                    <span className="card-label">About</span>
                    {editingAbout ? (
                        <div className="edit-field-row">
                            <input 
                                type="text" 
                                value={about} 
                                onChange={e => setAbout(e.target.value)}
                                maxLength={139}
                                autoFocus
                            />
                            <div className="edit-actions">
                                <small>{139 - about.length}</small>
                                <button type="button" className="save-btn" onClick={handleSaveAbout}>
                                    <Check />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="view-field-row">
                            <p className="field-value">{profile?.about || 'Hey there! I am using WhatsApp.'}</p>
                            <button type="button" className="edit-icon-btn" onClick={() => { setAbout(profile?.about || ''); setEditingAbout(true); }}>
                                <Edit />
                            </button>
                        </div>
                    )}
                </div>

                {/* Account Email Info */}
                <div className="drawer-card">
                    <span className="card-label">Account Email</span>
                    <p className="field-value email-value">{profile?.email || 'user@whatsapp.com'}</p>
                </div>
            </div>
        </div>
    );
};

export default ProfileDrawer;
