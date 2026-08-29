import { useState } from "react";
import { supabase } from "../supabaseClient";
import { setDemoUser } from "../helpers/demoChat";

const Login = ({ onDemoLogin }) => {
    const [mode, setMode] = useState("email"); // "email" | "signup"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [infoMsg, setInfoMsg] = useState("");

    const formatError = (error) => {
        if (!error) return "Unknown error occurred";
        const msg = error.message || String(error);
        if (
            msg.includes("Failed to fetch") || 
            msg.includes("fetch failed") || 
            msg.includes("Failed to execute 'fetch'") ||
            msg.includes("NetworkError") ||
            msg.includes("Network request failed") ||
            msg.includes("Invalid value")
        ) {
            return "Cannot reach the Supabase server. Please check your connection or click 'Instant Demo Mode' below!";
        }
        if (msg.includes("User already registered") || msg.includes("user_already_exists")) {
            return "An account with this email already exists. Please switch to Sign In.";
        }
        if (msg.includes("Invalid login credentials") || msg.includes("invalid_grant")) {
            return "Invalid email or password. Please try again or test with Instant Demo Mode.";
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
        if (!cleanEmail || !cleanPassword) {
            setErrorMsg("Please enter both email and password.");
            return;
        }
        setLoading(true);
        setErrorMsg("");
        setInfoMsg("");

        // Check if Admin Login credentials entered
        const isAdminCreds = cleanEmail === 'faizan0687@gmail.com' && cleanPassword === 'Faizan@0687';

        try {
            if (mode === "signup") {
                const { error, data } = await supabase.auth.signUp({
                    email: cleanEmail,
                    password: cleanPassword,
                    options: {
                        data: {
                            full_name: username.trim() || (cleanEmail === 'faizan0687@gmail.com' ? 'Muhammad Faizan' : cleanEmail.split('@')[0])
                        }
                    }
                });
                if (error) {
                    if (isAdminCreds) {
                        handleQuickDemo(cleanEmail);
                        return;
                    }
                    throw error;
                }
                if (data?.user && !data?.session) {
                    setInfoMsg("Account created! You can now sign in with your email and password.");
                    setMode("email");
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email: cleanEmail,
                    password: cleanPassword,
                });
                if (error) {
                    if (isAdminCreds) {
                        handleQuickDemo(cleanEmail);
                        return;
                    }
                    throw error;
                }
            }
        } catch (error) {
            if (isAdminCreds) {
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
                <p>Test the chat immediately without Supabase login:</p>
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
                    {loading ? "Authenticating..." : (mode === "signup" ? "Create Account" : "Sign In to WhatsApp")}
                </button>
            </form>
        </section>
    );
};

export default Login;