import Layout from "./Layout.jsx";

import Onboarding from "./Onboarding";

import Auth from "./Auth";

import PhoneVerification from "./PhoneVerification";

import Home from "./Home";

import History from "./History";

import Account from "./Account";

import Paywall from "./Paywall";

import PersonaSettings from "./PersonaSettings";

import HowCueOutWorks from "./HowCueOutWorks";

import PrivacyPolicy from "./PrivacyPolicy";

import TermsOfUse from "./TermsOfUse";

import Support from "./Support";

import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { getVerificationStatus } from '../api/verification';
import { useEffect, useState } from 'react';

const PAGES = {
    
    Onboarding: Onboarding,
    
    Auth: Auth,
    
    PhoneVerification: PhoneVerification,
    
    Home: Home,
    
    History: History,
    
    Account: Account,
    
    Paywall: Paywall,
    
    PersonaSettings: PersonaSettings,

    HowCueOutWorks: HowCueOutWorks,

    PrivacyPolicy: PrivacyPolicy,

    TermsOfUse: TermsOfUse,

    Support: Support,

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

// Component that redirects to the correct initial page based on auth state
function InitialRoute() {
    const { user, isLoading } = useAuth();
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
    const [phoneVerified, setPhoneVerified] = useState(null);

    useEffect(() => {
        const onboardingComplete = localStorage.getItem('onboardingComplete');
        setHasSeenOnboarding(onboardingComplete === 'true');
    }, []);

    useEffect(() => {
        if (!user) return;
        getVerificationStatus(user.id).then(({ isVerified }) => {
            setPhoneVerified(isVerified);
        });
    }, [user]);

    // Wait for auth and onboarding status to load
    if (isLoading || hasSeenOnboarding === null) return null;
    // If logged in, wait for phone check
    if (user && phoneVerified === null) return null;

    if (user) {
        return <Navigate to={phoneVerified ? "/Home" : "/PhoneVerification"} replace />;
    }

    if (hasSeenOnboarding) {
        return <Navigate to="/Auth" replace />;
    }

    return <Navigate to="/Onboarding" replace />;
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    return (
        <Layout currentPageName={currentPage}>
            <Routes>

                    <Route path="/" element={<InitialRoute />} />


                <Route path="/Onboarding" element={<Onboarding />} />

                <Route path="/Auth" element={<Auth />} />

                <Route path="/PhoneVerification" element={<PhoneVerification />} />

                <Route path="/Home" element={<Home />} />

                <Route path="/History" element={<History />} />

                <Route path="/Account" element={<Account />} />

                <Route path="/Paywall" element={<Paywall />} />

                <Route path="/PersonaSettings" element={<PersonaSettings />} />

                <Route path="/HowCueOutWorks" element={<HowCueOutWorks />} />

                <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />

                <Route path="/TermsOfUse" element={<TermsOfUse />} />

                <Route path="/Support" element={<Support />} />

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