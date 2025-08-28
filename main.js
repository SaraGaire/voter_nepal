// App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import LoginForm from './components/LoginForm';
import VotingInterface from './components/VotingInterface';
import DocumentVerification from './components/DocumentVerification';
import ReviewsSection from './components/ReviewsSection';
import AdminPanel from './components/AdminPanel';
import ResultsPanel from './components/ResultsPanel';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [votes, setVotes] = useState({});
  const [voterStats, setVoterStats] = useState({});
  const [reviews, setReviews] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState('vote');

  useEffect(() => {
    fetchCandidates();
    fetchVotes();
    fetchReviews();
    fetchVoterStats();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/candidates`);
      setCandidates(response.data);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };

  const fetchVotes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/votes`);
      setVotes(response.data);
    } catch (error) {
      console.error('Error fetching votes:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/reviews`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchVoterStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/voter-stats`);
      setVoterStats(response.data);
    } catch (error) {
      console.error('Error fetching voter stats:', error);
    }
  };

  const handleLogin = async (userData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, userData);
      setCurrentUser(response.data.user);
    } catch (error) {
      alert('Login failed: ' + error.response.data.message);
    }
  };

  const handleVote = async (candidateId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/vote`, {
        userId: currentUser.id,
        candidateId: candidateId
      });
      
      if (response.data.success) {
        setSelectedCandidate(candidateId);
        setHasVoted(true);
        fetchVotes();
        fetchVoterStats();
      }
    } catch (error) {
      alert('Voting failed: ' + error.response.data.message);
    }
  };

  const handleReviewSubmit = async (reviewData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/reviews`, {
        ...reviewData,
        userId: currentUser.id
      });
      
      if (response.data.success) {
        fetchReviews();
        alert(response.data.message);
      }
    } catch (error) {
      alert('Review submission failed: ' + error.response.data.message);
    }
  };

  const addCandidate = async (candidate) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/candidates`, candidate);
      if (response.data.success) {
        fetchCandidates();
      }
    } catch (error) {
      alert('Failed to add candidate: ' + error.response.data.message);
    }
  };

  const removeCandidate = async (candidateId) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/candidates/${candidateId}`);
      if (response.data.success) {
        fetchCandidates();
        fetchVotes();
      }
    } catch (error) {
      alert('Failed to remove candidate: ' + error.response.data.message);
    }
  };

  const getTotalVotes = () => {
    return Object.values(votes).reduce((sum, count) => sum + count, 0);
  };

  const getPercentage = (candidateVotes) => {
    const total = getTotalVotes();
    return total > 0 ? ((candidateVotes / total) * 100).toFixed(1) : 0;
  };

  if (!currentUser) {
    return (
      <div className="app-container">
        <div className="login-container">
          <div className="login-header">
            <h1>नेपाली मतदान प्रणाली</h1>
            <p>Nepali Global Voting System</p>
          </div>
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>नेपाली मतदान प्रणाली</h1>
            <p>Global Nepali Voting Platform</p>
          </div>
          <div className="user-info">
            <div className="user-details">
              <span>{currentUser.name}</span>
              {currentUser.documentVerified && <span className="verified">✓</span>}
            </div>
            <div className="user-country">{currentUser.country}</div>
          </div>
        </div>
        
        <nav className="app-nav">
          <button
            onClick={() => setCurrentView('vote')}
            className={currentView === 'vote' ? 'active' : ''}
          >
            मतदान / Vote
          </button>
          <button
            onClick={() => setCurrentView('reviews')}
            className={currentView === 'reviews' ? 'active' : ''}
          >
            समीक्षा / Reviews
          </button>
          <button
            onClick={() => setIsAdmin(!isAdmin)}
            className={isAdmin ? 'admin-active' : ''}
          >
            Admin
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'vote' && (
          <>
            {!currentUser.documentVerified ? (
              <DocumentVerification 
                user={currentUser} 
                onVerified={() => setCurrentUser({...currentUser, documentVerified: true})}
              />
            ) : !hasVoted ? (
              <VotingInterface candidates={candidates} onVote={handleVote} />
            ) : (
              <div className="vote-confirmation">
                <h2>मत सफलतापूर्वक दिइयो!</h2>
                <p>Your vote has been successfully cast!</p>
                <button onClick={() => setShowResults(true)}>
                  परिणाम हेर्नुहोस् / View Results
                </button>
              </div>
            )}

            {(hasVoted || showResults) && (
              <ResultsPanel 
                candidates={candidates}
                votes={votes}
                voterStats={voterStats}
                getPercentage={getPercentage}
                getTotalVotes={getTotalVotes}
              />
            )}
          </>
        )}

        {currentView === 'reviews' && (
          <ReviewsSection 
            reviews={reviews}
            onSubmitReview={handleReviewSubmit}
            candidates={candidates}
            currentUser={currentUser}
            isAdmin={isAdmin}
          />
        )}

        {isAdmin && (
          <AdminPanel 
            candidates={candidates}
            onAddCandidate={addCandidate}
            onRemoveCandidate={removeCandidate}
            reviews={reviews}
          />
        )}
      </main>
    </div>
  );
}

export default App;

// components/LoginForm.js
import React, { useState } from 'react';

const LoginForm = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    documentType: '',
    documentId: '',
    documentFile: null
  });

  const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
    'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Brunei', 'Bulgaria',
    // ... add all 195+ countries
    'Nepal', 'Netherlands', 'New Zealand', 'Norway',
    'United Kingdom', 'United States', 'Uruguay', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
  ];

  const documentTypes = [
    'Passport', 'National ID', 'Citizenship Certificate', 'Driving License', 'Voter ID'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name && formData.country && formData.documentType && formData.documentId) {
      onLogin(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="form-group">
        <label>तपाईंको नाम / Your Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          placeholder="आफ्नो नाम लेख्नुहोस्"
          required
        />
      </div>
      
      <div className="form-group">
        <label>तपाईं कुन देशमा हुनुहुन्छ? / Current Country</label>
        <select
          value={formData.country}
          onChange={(e) => setFormData({...formData, country: e.target.value})}
          required
        >
          <option value="">देश छान्नुहोस् / Select Country</option>
          {countries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>कागजातको प्रकार / Document Type</label>
        <select
          value={formData.documentType}
          onChange={(e) => setFormData({...formData, documentType: e.target.value})}
          required
        >
          <option value="">कागजात छान्नुहोस् / Select Document</option>
          {documentTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>कागजात नम्बर / Document Number</label>
        <input
          type="text"
          value={formData.documentId}
          onChange={(e) => setFormData({...formData, documentId: e.target.value})}
          placeholder="कागजात नम्बर"
          required
        />
      </div>
      
      <button type="submit" className="submit-btn">
        मतदानमा सहभागी हुनुहोस् / Join Voting
      </button>
    </form>
  );
};

export default LoginForm;

// package.json
{
  "name": "nepali-voting-frontend",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
