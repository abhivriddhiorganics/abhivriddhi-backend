# 🚀 Abhivriddhi Backend Setup Guide

## ✅ What We've Built

Your backend is now **completely set up** with:

### 🗄️ Database Models
- **User Model**: Complete user schema with authentication fields
- **OTP Model**: OTP tracking with auto-expiry

### 🔐 Authentication System
- **Registration**: Email + Mobile + Password
- **OTP Verification**: Email and SMS OTP support
- **Login Options**: OTP-based or password-based login
- **JWT Tokens**: Secure authentication tokens

### 📧 Communication Services
- **Email OTP**: HTML templates via Nodemailer
- **SMS OTP**: Twilio integration for mobile OTP

### 🛡️ Security Features
- Password hashing (bcryptjs)
- JWT authentication
- Rate limiting (OTP spam protection)
- Input validation
- CORS configuration

### 📡 API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/login` - Password login
- `GET /api/auth/me` - Get user profile
- User management endpoints for profile/address updates

---

## 🛠️ Setup Instructions

### Step 1: Install MongoDB

**Option A: MongoDB Community Edition (Recommended)**
```bash
# Download and install from: https://www.mongodb.com/try/download/community
# Or use Chocolatey (Windows):
choco install mongodb
```

**Option B: MongoDB Atlas (Cloud)**
1. Go to https://cloud.mongodb.com/
2. Create free account
3. Create cluster
4. Get connection string

### Step 2: Configure Environment Variables

Edit `backend/.env` file:

```env
# Database - Update with your MongoDB connection
MONGODB_URI=mongodb://localhost:27017/abhivriddhi
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/abhivriddhi

# JWT - Generate a secure random string
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production_$(openssl rand -hex 32)

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 3: Set Up Email (Gmail)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in `EMAIL_PASS`

### Step 4: Set Up SMS (Twilio)

1. **Create Twilio Account**: https://www.twilio.com/
2. **Get Phone Number**: Buy a phone number ($1/month)
3. **Configure Credentials**:
   - Account SID: From Twilio Console
   - Auth Token: From Twilio Console
   - Phone Number: Your Twilio number

### Step 5: Start the Backend

```bash
cd backend
npm run dev
```

Server will start on: `http://localhost:5000`

---

## 🧪 Testing the API

### Test Registration Flow

**1. Register User:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "mobile": "+919876543210",
    "password": "password123"
  }'
```

**2. Send OTP:**
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "type": "email",
    "purpose": "registration"
  }'
```

**3. Verify OTP:**
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "otp": "123456",
    "type": "email",
    "purpose": "registration"
  }'
```

---

## 🔗 Frontend Integration

Update your React frontend to connect to the backend:

### 1. Install Axios (for API calls)
```bash
npm install axios
```

### 2. Create API Service
Create `src/services/api.js`:

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### 3. Update LoginPage.jsx

Replace the demo form with real API calls:

```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function LoginPage() {
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    otp: '',
    step: 'login' // 'login' or 'otp'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      await api.post('/auth/send-otp', {
        identifier: formData.identifier,
        type: formData.identifier.includes('@') ? 'email' : 'mobile',
        purpose: 'login'
      });
      setFormData(prev => ({ ...prev, step: 'otp' }));
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        identifier: formData.identifier,
        otp: formData.otp,
        type: formData.identifier.includes('@') ? 'email' : 'mobile',
        purpose: 'login'
      });
      
      localStorage.setItem('token', response.data.token);
      navigate('/');
    } catch (error) {
      alert(error.response?.data?.message || 'Invalid OTP');
    }
    setLoading(false);
  };

  const handlePasswordLogin = async () => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        identifier: formData.identifier,
        password: formData.password
      });
      
      localStorage.setItem('token', response.data.token);
      navigate('/');
    } catch (error) {
      alert(error.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        
        {formData.step === 'login' ? (
          <>
            <input
              type="text"
              placeholder="Email or Mobile"
              value={formData.identifier}
              onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
              className="w-full p-3 border rounded-lg mb-4"
            />
            
            <input
              type="password"
              placeholder="Password (optional)"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full p-3 border rounded-lg mb-4"
            />
            
            <button
              onClick={handlePasswordLogin}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg mb-4"
            >
              {loading ? 'Logging in...' : 'Login with Password'}
            </button>
            
            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg"
            >
              {loading ? 'Sending OTP...' : 'Login with OTP'}
            </button>
          </>
        ) : (
          <>
            <p className="text-center mb-4">
              OTP sent to {formData.identifier}
            </p>
            
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={formData.otp}
              onChange={(e) => setFormData(prev => ({ ...prev, otp: e.target.value }))}
              className="w-full p-3 border rounded-lg mb-4 text-center text-2xl"
              maxLength="6"
            />
            
            <button
              onClick={handleVerifyOTP}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg mb-4"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            
            <button
              onClick={() => setFormData(prev => ({ ...prev, step: 'login' }))}
              className="w-full text-gray-600 py-2"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
```

---

## 📱 Mobile Number Format

The system expects Indian mobile numbers in this format:
- `+91XXXXXXXXXX` (e.g., `+919876543210`)
- Must start with +91
- Must be exactly 13 characters

---

## 🔒 Security Notes

- **JWT Secret**: Use a strong, random string in production
- **OTP Expiry**: 10 minutes by default
- **Rate Limiting**: 5 OTP requests per 5 minutes per IP
- **Password Requirements**: Minimum 6 characters
- **Input Validation**: All inputs are validated server-side

---

## 🚀 Production Deployment

1. **Environment Variables**: Set strong secrets
2. **MongoDB**: Use MongoDB Atlas or managed instance
3. **SSL/TLS**: Enable HTTPS
4. **Rate Limiting**: Configure based on needs
5. **Monitoring**: Add logging and monitoring
6. **Backup**: Set up database backups

---

## 🆘 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
net start MongoDB

# Or use MongoDB Compass to test connection
```

### Email Not Sending
- Check Gmail app password
- Verify less secure app access
- Check spam folder

### SMS Not Sending
- Verify Twilio credentials
- Check account balance
- Ensure phone number is verified

### API Errors
- Check server logs: `npm run dev`
- Verify environment variables
- Test with Postman

---

## 📞 Support

Your backend is now ready! The authentication system supports:
- ✅ Email OTP login
- ✅ Mobile OTP login  
- ✅ Password-based login
- ✅ User registration with dual verification
- ✅ JWT token authentication
- ✅ Profile management
- ✅ Address management

Next step: Update your frontend to integrate with these APIs!