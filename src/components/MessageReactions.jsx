const DEFAULT_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export const ReactionBar = ({ onSelectReaction }) => {
    return (
        <div className="reaction-bar" onClick={e => e.stopPropagation()}>
            {DEFAULT_REACTIONS.map(emoji => (
                <button 
                    key={emoji} 
                    type="button" 
                    className="reaction-emoji-btn" 
                    onClick={() => onSelectReaction(emoji)}
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
};

export const ReactionBadgeList = ({ reactions = {}, currentUserEmail, onToggleReaction }) => {
    // reactions: { [emoji]: string[] (emails) }
    const entries = Object.entries(reactions || {}).filter(([_, emails]) => emails && emails.length > 0);
    if (entries.length === 0) return null;

    return (
        <div className="message-reactions-badges" onClick={e => e.stopPropagation()}>
            {entries.map(([emoji, emails]) => {
                const isMyReaction = currentUserEmail && emails.includes(currentUserEmail.toLowerCase());
                return (
                    <button 
                        key={emoji} 
                        type="button" 
                        className={`reaction-badge-item ${isMyReaction ? 'my-reaction' : ''}`}
                        onClick={() => onToggleReaction(emoji)}
                        title={`${emails.length} reaction${emails.length > 1 ? 's' : ''}`}
                    >
                        <span>{emoji}</span>
                        {emails.length > 1 && <small>{emails.length}</small>}
                    </button>
                );
            })}
        </div>
    );
};
