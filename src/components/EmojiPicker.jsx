import { useState } from 'react';

const EMOJI_CATEGORIES = [
    {
        name: "Smileys & Emotion",
        emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬"]
    },
    {
        name: "People & Gestures",
        emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄"]
    },
    {
        name: "Hearts & Symbols",
        emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "🉑", "☢️", "☣️", "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "❇️", "✳️", "‼️", "⁉️", "❓", "❔", "❕", "❗", "❌", "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "♨️", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭"]
    },
    {
        name: "Activities & Objects",
        emojis: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "🧗", "🔥", "✨", "🎉", "🎊", "🎁", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "⏱️", "⏲️", "⏰", "🕰️"]
    }
];

const EmojiPicker = ({ isOpen, onSelectEmoji }) => {
    const [search, setSearch] = useState('');

    if (!isOpen) return null;

    const filteredCategories = EMOJI_CATEGORIES.map(cat => ({
        name: cat.name,
        emojis: cat.emojis.filter(e => !search || e.includes(search))
    })).filter(cat => cat.emojis.length > 0);

    return (
        <div className="emoji-picker-container" onClick={e => e.stopPropagation()}>
            <div className="emoji-picker-search">
                <input 
                    type="text" 
                    placeholder="Search emoji..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoFocus
                />
            </div>
            <div className="emoji-picker-body">
                {filteredCategories.map(cat => (
                    <div key={cat.name} className="emoji-category-section">
                        <span className="category-title">{cat.name}</span>
                        <div className="category-emojis-grid">
                            {cat.emojis.map((emoji, idx) => (
                                <button 
                                    key={idx} 
                                    type="button" 
                                    className="emoji-btn"
                                    onClick={() => onSelectEmoji(emoji)}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EmojiPicker;
