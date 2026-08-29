import { useState, useRef, useEffect } from "react";
import Send from "./icons/Send";
import Mic from "./icons/Mic";
import Paperclip from "./icons/Paperclip";
import Image from "./icons/Image";
import FileText from "./icons/FileText";
import VideoIcon from "./icons/VideoIcon";
import Close from "./icons/Close";
import Smiley from "./icons/Smiley";
import EmojiPicker from "./EmojiPicker";
import { supabase } from "../supabaseClient";
import { sendDemoMessage } from "../helpers/demoChat";
import { uploadToCloudinary } from "../helpers/cloudinaryUpload";
import { broadcastGlobalEvent } from "../helpers/realtimeChannel";

const MAX_VIDEO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

const SendMessage = ({ 
    scroll, 
    session, 
    isDemo, 
    activeGroupId, 
    onNewLocalMessage,
    replyTo = null,
    onCancelReply = null,
    onTyping = null
}) => {
    const [message, setMessage] = useState("");
    const [attachedFile, setAttachedFile] = useState(null); // { type, name, dataUrl, size, rawFile, uploadPromise }
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEmojiOpen, setIsEmojiOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const email = session?.user?.email || "anonymous";
    const fileInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const docInputRef = useRef(null);
    const inputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Broadcast live typing status
    const handleInputChange = (e) => {
        setMessage(e.target.value);
        if (onTyping) {
            onTyping();
        }
    };

    // Close popups on click outside
    useEffect(() => {
        const handleDocClick = () => {
            setIsMenuOpen(false);
            setIsEmojiOpen(false);
        };
        window.addEventListener('click', handleDocClick);
        return () => window.removeEventListener('click', handleDocClick);
    }, []);

    // Clipboard paste image / screenshot handler (Ctrl+V)
    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    processSelectedFile(file, 'image');
                    break;
                }
            }
        }
    };

    const handleEmojiSelect = (emoji) => {
        setMessage(prev => prev + emoji);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const processSelectedFile = (file, type) => {
        const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
        const mediaType = isPdf ? 'pdf' : type;

        // Create quick local blob preview
        const localPreview = (type === 'image' || type === 'video') ? URL.createObjectURL(file) : null;
        setPreviewUrl(localPreview);

        const uploadPromise = uploadToCloudinary(file, mediaType);

        setAttachedFile({
            type: mediaType,
            name: file.name || (type === 'video' ? 'video.mp4' : 'photo.jpg'),
            dataUrl: localPreview,
            size: formatFileSize(file.size),
            rawFile: file,
            uploadPromise
        });
    };

    const handleFileSelect = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        // Video Size Check (Max 10MB)
        if (type === 'video' && file.size > MAX_VIDEO_SIZE_BYTES) {
            alert(`Video size exceeds the 10 MB limit (${formatFileSize(file.size)}). Please select a video under 10 MB.`);
            e.target.value = "";
            return;
        }

        setIsMenuOpen(false);
        processSelectedFile(file, type);
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return "0 KB";
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const removeAttachment = () => {
        setAttachedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (videoInputRef.current) videoInputRef.current.value = "";
        if (docInputRef.current) docInputRef.current.value = "";
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setIsUploading(true);
                try {
                    const uploaded = await uploadToCloudinary(audioBlob, 'audio');
                    sendVoiceMessage(uploaded?.url || URL.createObjectURL(audioBlob));
                } catch (err) {
                    console.warn("Audio upload failed, using blob fallback:", err);
                    const reader = new FileReader();
                    reader.onload = () => sendVoiceMessage(reader.result);
                    reader.readAsDataURL(audioBlob);
                } finally {
                    setIsUploading(false);
                    stream.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Microphone access error:", err);
            alert("Could not access microphone. Please enable microphone permissions in your browser.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerIntervalRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerIntervalRef.current);
            audioChunksRef.current = [];
        }
    };

    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const sendVoiceMessage = async (audioDataUrl) => {
        const payload = {
            id: Date.now(),
            group_id: activeGroupId,
            email,
            content: "",
            media_type: 'audio',
            media_url: audioDataUrl,
            file_name: `Voice_note_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`,
            file_size: "Voice Note",
            reply_to: replyTo ? { ...replyTo } : null,
            reactions: {},
            seen_by: [email.toLowerCase()],
            is_deleted: false,
            created_at: new Date().toISOString()
        };

        if (replyTo && onCancelReply) onCancelReply();

        // 1. Broadcast immediately to all connected devices across internet (Mobile <-> PC)
        broadcastGlobalEvent('NEW_MESSAGE', payload);

        // 2. Save locally for instant UI update
        const saved = sendDemoMessage(payload);
        if (onNewLocalMessage) onNewLocalMessage(saved);

        // 3. Persist to Supabase database
        try {
            const { data } = await supabase.from('messages').insert([payload]).select();
            if (data && data[0] && onNewLocalMessage) {
                onNewLocalMessage(data[0]);
            }
        } catch (err) {
            console.warn("Voice note cloud sync note:", err.message);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();

        if ((!message.trim() && !attachedFile) || isUploading) return;

        const currentText = message.trim();
        const currentAttachment = attachedFile;
        const currentReply = replyTo;

        setMessage("");
        setAttachedFile(null);
        setPreviewUrl(null);
        if (onCancelReply) onCancelReply();

        // Resolve final Cloudinary URL
        let finalMediaUrl = currentAttachment?.dataUrl || null;
        let finalSize = currentAttachment?.size || null;
        let finalFileName = currentAttachment?.name || null;

        if (currentAttachment?.uploadPromise) {
            try {
                setIsUploading(true);
                const uploadResult = await currentAttachment.uploadPromise;
                if (uploadResult?.url) {
                    finalMediaUrl = uploadResult.url;
                    finalSize = uploadResult.sizeFormatted || finalSize;
                    finalFileName = uploadResult.fileName || finalFileName;
                }
            } catch (err) {
                console.warn("Upload resolution failed, using fallback:", err);
            } finally {
                setIsUploading(false);
            }
        }

        const messagePayload = {
            id: Date.now(),
            group_id: activeGroupId,
            email,
            content: currentText,
            media_type: currentAttachment ? currentAttachment.type : 'text',
            media_url: finalMediaUrl,
            file_name: finalFileName,
            file_size: finalSize,
            reply_to: currentReply ? { ...currentReply } : null,
            reactions: {},
            seen_by: [email.toLowerCase()],
            is_deleted: false,
            created_at: new Date().toISOString()
        };

        // 1. Broadcast immediately to all connected devices across internet (Mobile <-> PC)
        broadcastGlobalEvent('NEW_MESSAGE', messagePayload);

        // 2. Save locally for instant UI update
        const saved = sendDemoMessage(messagePayload);
        if (onNewLocalMessage) onNewLocalMessage(saved);

        // 3. Persist to Supabase database
        try {
            const { data, error } = await supabase.from('messages').insert([messagePayload]).select();
            if (error) {
                const fallbackPayload = {
                    group_id: activeGroupId,
                    email,
                    content: currentText || (currentAttachment ? `[${currentAttachment.type}] ${finalFileName}` : ''),
                    created_at: new Date().toISOString()
                };
                const { data: fbData } = await supabase.from('messages').insert([fallbackPayload]).select();
                if (fbData && fbData[0] && onNewLocalMessage) {
                    onNewLocalMessage({ ...messagePayload, id: fbData[0].id });
                }
            } else if (data && data[0] && onNewLocalMessage) {
                onNewLocalMessage(data[0]);
            }
        } catch (err) {
            console.warn("Message cloud sync note:", err.message);
        }
    };

    return (
        <footer className="send-message-bar">
            {/* Quoted Reply Preview Bar */}
            {replyTo && (
                <div className="quoted-reply-preview-bar">
                    <div className="reply-bar-content">
                        <span className="reply-bar-sender">Replying to @{replyTo.sender}</span>
                        <p className="reply-bar-snippet">{replyTo.text}</p>
                    </div>
                    <button type="button" className="reply-bar-cancel" onClick={onCancelReply} title="Cancel reply">
                        <Close />
                    </button>
                </div>
            )}

            {/* Attachment Preview Box */}
            {attachedFile && (
                <div className="attachment-preview">
                    {attachedFile.type === 'image' ? (
                        <div className="preview-image-box">
                            <img src={previewUrl} alt="Preview" />
                            <div className="preview-meta">
                                <span>{attachedFile.name}</span>
                                <small>{attachedFile.size}</small>
                            </div>
                        </div>
                    ) : attachedFile.type === 'video' ? (
                        <div className="preview-image-box">
                            <video src={previewUrl} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />
                            <div className="preview-meta">
                                <span>{attachedFile.name}</span>
                                <small>{attachedFile.size} • Video</small>
                            </div>
                        </div>
                    ) : (
                        <div className="preview-file-box">
                            <FileText />
                            <div className="preview-meta">
                                <span>{attachedFile.name}</span>
                                <small>{attachedFile.size} • {attachedFile.type.toUpperCase()}</small>
                            </div>
                        </div>
                    )}
                    <button type="button" className="preview-remove-btn" onClick={removeAttachment} title="Remove attachment">
                        <Close />
                    </button>
                </div>
            )}

            {/* Live Audio Recorder Bar */}
            {isRecording ? (
                <div className="voice-recorder-bar">
                    <button type="button" className="voice-cancel-btn" onClick={cancelRecording} title="Cancel recording">
                        <Close />
                    </button>
                    <div className="voice-status">
                        <span className="recording-pulse"></span>
                        <span className="voice-timer">{formatTimer(recordingTime)}</span>
                        <span className="voice-recording-text">Recording voice note...</span>
                    </div>
                    <button type="button" className="voice-send-btn" onClick={stopRecording} title="Send voice note">
                        <Send />
                    </button>
                </div>
            ) : (
                <form className="send-form" onSubmit={sendMessage}>
                    {/* Emoji Picker Button */}
                    <div className="emoji-picker-wrap" onClick={e => e.stopPropagation()}>
                        <button 
                            type="button" 
                            className={`attach-btn ${isEmojiOpen ? 'active' : ''}`}
                            onClick={() => { setIsEmojiOpen(!isEmojiOpen); setIsMenuOpen(false); }}
                            title="Insert Emoji"
                        >
                            <Smiley />
                        </button>
                        <EmojiPicker 
                            isOpen={isEmojiOpen} 
                            onSelectEmoji={handleEmojiSelect}
                            onClose={() => setIsEmojiOpen(false)}
                        />
                    </div>

                    {/* Paperclip Attachment Button */}
                    <div className="attach-container" onClick={e => e.stopPropagation()}>
                        <button 
                            type="button" 
                            className={`attach-btn ${isMenuOpen ? 'active' : ''}`}
                            onClick={() => { setIsMenuOpen(!isMenuOpen); setIsEmojiOpen(false); }}
                            title="Attach Photo, Video, or Document"
                        >
                            <Paperclip />
                        </button>

                        {isMenuOpen && (
                            <div className="attach-popup">
                                <button type="button" className="attach-option photo" onClick={() => fileInputRef.current?.click()}>
                                    <Image /> Photos
                                </button>
                                <button type="button" className="attach-option video" onClick={() => videoInputRef.current?.click()}>
                                    <VideoIcon /> Videos (Max 10 MB)
                                </button>
                                <button type="button" className="attach-option document" onClick={() => docInputRef.current?.click()}>
                                    <FileText /> Document / PDF
                                </button>
                            </div>
                        )}

                        {/* Hidden File Inputs */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: "none" }} 
                            accept="image/*"
                            onChange={(e) => handleFileSelect(e, 'image')}
                        />
                        <input 
                            type="file" 
                            ref={videoInputRef} 
                            style={{ display: "none" }} 
                            accept="video/mp4,video/webm,video/ogg,video/quicktime"
                            onChange={(e) => handleFileSelect(e, 'video')}
                        />
                        <input 
                            type="file" 
                            ref={docInputRef} 
                            style={{ display: "none" }} 
                            accept=".pdf,.doc,.docx,.txt,.csv,.zip,.rar,.xlsx"
                            onChange={(e) => handleFileSelect(e, 'file')}
                        />
                    </div>

                    {/* Chat Text Input */}
                    <input 
                        type="text" 
                        ref={inputRef}
                        className="chat-input"
                        placeholder="Type a message (paste images Ctrl+V)..."
                        value={message}
                        onChange={handleInputChange}
                        onPaste={handlePaste}
                    />

                    {/* Send Button or Mic Button */}
                    {message.trim() || attachedFile ? (
                        <button type="submit" className="send-btn" title="Send message">
                            <Send />
                        </button>
                    ) : (
                        <button type="button" className="mic-btn" onClick={startRecording} title="Hold/Click to record voice note">
                            <Mic />
                        </button>
                    )}
                </form>
            )}
        </footer>
    );
};

export default SendMessage;