import Close from './icons/Close';
import Search from './icons/Search';

const ChatSearchBar = ({ 
    isOpen, 
    onClose, 
    query, 
    onChangeQuery, 
    currentMatchIndex, 
    totalMatches, 
    onNextMatch, 
    onPrevMatch 
}) => {
    if (!isOpen) return null;

    return (
        <div className="chat-search-bar" onClick={e => e.stopPropagation()}>
            <div className="chat-search-input-wrap">
                <Search />
                <input 
                    type="text" 
                    placeholder="Search in this chat..." 
                    value={query}
                    onChange={e => onChangeQuery(e.target.value)}
                    autoFocus
                />
                {query && (
                    <button type="button" className="search-clear-btn" onClick={() => onChangeQuery('')}>
                        <Close />
                    </button>
                )}
            </div>

            {totalMatches > 0 && (
                <div className="search-nav-controls">
                    <span className="search-count-text">
                        {currentMatchIndex + 1} of {totalMatches}
                    </span>
                    <button type="button" className="search-nav-arrow" onClick={onPrevMatch} title="Previous match">
                        ▲
                    </button>
                    <button type="button" className="search-nav-arrow" onClick={onNextMatch} title="Next match">
                        ▼
                    </button>
                </div>
            )}

            <button type="button" className="search-close-btn" onClick={onClose} title="Close search">
                <Close />
            </button>
        </div>
    );
};

export default ChatSearchBar;
