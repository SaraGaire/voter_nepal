import React, { useState } from "react";

const LoginForm = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    name: "",
    country: "",
    documentType: "",
    documentId: "",
    documentFile: null,
  });

  const countries = [
    "Nepal", "India", "United States", "United Kingdom",
    "Australia", "Germany", "Canada", "Japan", "China"
    // Replace with a country list library
  ];

  const documentTypes = [
    "Passport", "National ID", "Citizenship Certificate", "Driving License", "Voter ID",
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
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="आफ्नो नाम लेख्नुहोस्"
          required
        />
      </div>

      <div className="form-group">
        <label>देश / Country</label>
        <select
          value={formData.country}
          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          required
        >
          <option value="">Select Country</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>कागजात / Document Type</label>
        <select
          value={formData.documentType}
          onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
          required
        >
          <option value="">Select Document</option>
          {documentTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Document Number</label>
        <input
          type="text"
          value={formData.documentId}
          onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
          placeholder="कागजात नम्बर"
          required
        />
      </div>

      <div className="form-group">
        <label>Upload Document</label>
        <input
          type="file"
          onChange={(e) => setFormData({ ...formData, documentFile: e.target.files[0] })}
        />
      </div>

      <button type="submit" className="submit-btn">
        मतदानमा सहभागी हुनुहोस् / Join Voting
      </button>
    </form>
  );
};

export default LoginForm;
