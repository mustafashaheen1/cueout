import Layout from "./Layout.jsx";

import Onboarding from "./Onboarding";

import Auth from "./Auth";

import PhoneVerification from "./PhoneVerification";

import Home from "./Home";

import History from "./History";

import Account from "./Account";

import Paywall from "./Paywall";

import PersonaSettings from "./PersonaSettings";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Onboarding: Onboarding,
    
    Auth: Auth,
    
    PhoneVerification: PhoneVerification,
    
    Home: Home,
    
    History: History,
    
    Account: Account,
    
    Paywall: Paywall,
    
    PersonaSettings: PersonaSettings,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Onboarding />} />
                
                
                <Route path="/Onboarding" element={<Onboarding />} />
                
                <Route path="/Auth" element={<Auth />} />
                
                <Route path="/PhoneVerification" element={<PhoneVerification />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/History" element={<History />} />
                
                <Route path="/Account" element={<Account />} />
                
                <Route path="/Paywall" element={<Paywall />} />
                
                <Route path="/PersonaSettings" element={<PersonaSettings />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}