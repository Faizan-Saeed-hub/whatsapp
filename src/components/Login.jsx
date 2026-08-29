import { useState } from "react";
import { supabase } from "../supabaseClient";
import { setDemoUser, saveDemoProfile, getDemoProfile } from "../helpers/demoChat";
import { generate6DigitId } from "../helpers/userIdHelper";
import { getAvatarN } from "../helpers/getAvatarN";

const Login = ({ onDemoLogin }) => {
    const [mode, setMode] = useState("signup"); // "signup" | "email"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [infoMsg, setInfoMsg] = useState("");

    const formatError = (error) => {
        if (!error) return "Unknown error occurred";
        const msg = error.message || String(error);
        if (msg.includes("User already registered") || msg.includes("user_already_exists")) {
            return "An account with this email already exists. Please switch to Sign In.";
        }
        if (msg.includes("Invalid login credentials") || msg.includes("invalid_grant")) {
            return "Invalid email or password. Please check and try again.";
        }
        if (msg.includes("Password should be at least")) {
            return "Password must be at least 6 characters long.";
        }
        return msg;
    };

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();
        const cleanName = username.trim();

        if (!cleanEmail || !cleanPassword) {
            setErrorMsg("Please enter both email and password.");
            return;
        }

        if (cleanPassword.length < 6) {
            setErrorMsg("Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        setErrorMsg("");
        setInfoMsg("");

        // Check if Admin Login credentials entered
        const isAdminCreds = cleanEmail === 'faizan0687@gmail.com' && cleanPassword === 'Faizan@0687';

        // Prepare local profile fallback
        const existingProfile = getDemoProfile(cleanEmail);
        const displayName = cleanName || existingProfile?.username || (cleanEmail === 'faizan0687@gmail.com' ? 'Muhammad Faizan' : cleanEmail.split('@')[0]);
        
        const fallbackProfile = {
            email: cleanEmail,
            username: displayName,
            user_tag: existingProfile?.user_tag || generate6DigitId(cleanEmail),
            about: cleanEmail === 'faizan0687@gmail.com' ? 'Admin • Official WhatsApp Moderator' : 'Hey there! I am using WhatsApp.',
            avatar_num: existingProfile?.avatar_num || String(getAvatarN(cleanEmail)),
            avatar_url: existingProfile?.avatar_url || null
        };

        try {
            if (mode === "signup") {
                const { error, data } = await supabase.auth.signUp({
                    email: cleanEmail,
                    password: cleanPassword,
                    options: {
                        data: {
                            full_name: displayName
                        }
                    }
                });

                if (error) {
                    // If network/fetch failure or admin, log in directly via local real-time store
                    const isNetwork = error.message?.includes("fetch") || error.message?.includes("network") || error.message?.includes("Failed to execute");
                    if (isNetwork || isAdminCreds) {
                        saveDemoProfile(fallbackProfile);
                        handleQuickDemo(cleanEmail);
                        return;
                    }
                    throw error;
                }

                if (data?.user && !data?.session) {
                    setInfoMsg("Account created! Signing you in...");
                    saveDemoProfile(fallbackProfile);
                    setTimeout(() => handleQuickDemo(cleanEmail), 600);
                } else if (data?.session) {
                    saveDemoProfile(fallbackProfile);
                }
            } else {
                const { error, data } = await supabase.auth.signInWithPassword({
                    email: cleanEmail,
                    password: cleanPassword,
                });

                if (error) {
                    const isNetwork = error.message?.includes("fetch") || error.message?.includes("network") || error.message?.includes("Failed to execute");
                    if (isNetwork || isAdminCreds) {
                        saveDemoProfile(fallbackProfile);
                        handleQuickDemo(cleanEmail);
                        return;
                    }
                    throw error;
                }

                if (data?.session) {
                    saveDemoProfile(fallbackProfile);
                }
            }
        } catch (error) {
            const msg = error.message || String(error);
            const isNetwork = msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to execute");
            
            if (isNetwork || isAdminCreds) {
                saveDemoProfile(fallbackProfile);
                handleQuickDemo(cleanEmail);
            } else {
                setErrorMsg(formatError(error));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleQuickDemo = (userEmail) => {
        setDemoUser(userEmail);
        if (onDemoLogin) {
            onDemoLogin(userEmail);
        }
    };

    return (
        <section className="login-card">
            {/* Header */}
            <div className="login-header">
                <div className="login-logo-circle">
                    <img src="/wp-icon.png" alt="WhatsApp" className="login-logo-img" />
                </div>
                <h2>WhatsApp Web</h2>
                <p>{mode === 'signup' ? 'Create a new account to get started' : 'Sign in to start messaging in real-time'}</p>
            </div>

            {/* Instant Demo Banner */}
            <div className="demo-banner">
                <div className="demo-badge">🚀 Instant Demo Mode</div>
                <p>Test the chat immediately without password:</p>
                <div className="demo-buttons">
                    <button type="button" onClick={() => handleQuickDemo("bob@test.com")}>
                        Login as Bob
                    </button>
                    <button type="button" onClick={() => handleQuickDemo("alice@test.com")}>
                        Login as Alice
                    </button>
                </div>
            </div>

            <div className="divider">
                <span>OR SIGN IN WITH EMAIL</span>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="login-tabs">
                <button 
                    type="button"
                    className={`tab-btn ${mode === 'email' ? 'active' : ''}`}
                    onClick={() => { setMode('email'); setErrorMsg(''); setInfoMsg(''); }}
                >
                    Sign In
                </button>
                <button 
                    type="button"
                    className={`tab-btn ${mode === 'signup' ? 'active' : ''}`}
                    onClick={() => { setMode('signup'); setErrorMsg(''); setInfoMsg(''); }}
                >
                    Register
                </button>
            </div>

            {/* Form */}
            <form className="login-form" onSubmit={handleEmailAuth}>
                {mode === 'signup' && (
                    <div className="input-group">
                        <label>Display Name (Optional)</label>
                        <input 
                            type="text" 
                            placeholder="e.g. John Doe" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                )}

                <div className="input-group">
                    <label>Email Address</label>
                    <input 
                        type="email" 
                        placeholder="you@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="input-group">
                    <label>Password</label>
                    <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {errorMsg && <div className="alert-box error">{errorMsg}</div>}
                {infoMsg && <div className="alert-box info">{infoMsg}</div>}

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "Please wait..." : (mode === "signup" ? "Create Account" : "Sign In to WhatsApp")}
                </button>
            </form>
        </section>
    );
};

export default Login;