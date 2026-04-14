# 🚀 Complete MongoDB Setup Guide for Beginners

## 📚 MongoDB vs Firebase/MySQL Comparison

| Concept | Firebase/Firestore | MySQL | MongoDB |
|---------|-------------------|-------|---------|
| **Data Structure** | Collections → Documents | Tables → Rows | Collections → Documents |
| **Schema** | Flexible (NoSQL) | Fixed (SQL) | Flexible (NoSQL) |
| **Query Language** | Firebase SDK | SQL | MongoDB Query Language |
| **Primary Key** | Auto-generated ID | Auto-increment ID | Auto-generated ObjectId |
| **Relationships** | Subcollections/References | Foreign Keys | References/Embedded |
| **Scaling** | Automatic | Manual | Automatic |

**Key Differences:**
- **No Tables/Rows**: MongoDB uses Collections/Documents (like Firebase)
- **No SQL**: Uses JSON-like queries instead of SQL
- **Flexible Schema**: Add fields anytime (like Firebase)
- **ObjectId**: Auto-generated unique IDs for documents

---

## 🛠️ Installation Options

### Option 1: Local MongoDB (Recommended for Development)

**Step 1: Download MongoDB**
1. Go to: https://www.mongodb.com/try/download/community
2. Select:
   - Version: 7.0 or later
   - Platform: Windows
   - Package: MSI
3. Download and run the installer

**Step 2: Install MongoDB**
1. Choose "Complete" installation
2. Install MongoDB Compass (GUI tool) when prompted
3. Finish installation

**Step 3: Start MongoDB Service**
```bash
# Open Command Prompt as Administrator
net start MongoDB
```

**Step 4: Verify Installation**
```bash
# Check if MongoDB is running
net start | find "MongoDB"

# Or check service status
sc query MongoDB
```

### Option 2: MongoDB Atlas (Cloud - Easier)

**Step 1: Create Account**
1. Go to: https://cloud.mongodb.com/
2. Sign up for free account
3. Choose "M0" cluster (free forever)

**Step 2: Create Cluster**
1. Choose AWS/Google Cloud/Azure
2. Select region closest to you
3. Create cluster (takes 5-10 minutes)

**Step 3: Set up Database User**
1. Go to "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Set username: `abhivriddhi_user`
5. Set password: `your_secure_password`
6. Click "Add User"

**Step 4: Configure Network Access**
1. Go to "Network Access"
2. Click "Add IP Address"
3. Choose "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

**Step 5: Get Connection String**
1. Go to "Clusters"
2. Click "Connect"
3. Choose "Connect your application"
4. Copy the connection string

---

## ⚙️ Configure Your Backend

### Step 1: Update Environment Variables

Edit `backend/.env`:

**For Local MongoDB:**
```env
MONGODB_URI=mongodb://localhost:27017/abhivriddhi
```

**For MongoDB Atlas:**
```env
MONGODB_URI=mongodb+srv://abhivriddhi_user:your_secure_password@cluster0.xxxxx.mongodb.net/abhivriddhi?retryWrites=true&w=majority
```

### Step 2: Configure Email & SMS (Optional for Testing)

**Gmail Setup:**
1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Generate App Password:
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (custom name)"
   - Copy the 16-character password

**Twilio Setup (Optional):**
1. Sign up at: https://www.twilio.com/
2. Get free credits ($15+)
3. Buy a phone number ($1/month)
4. Copy SID, Token, and Phone Number

Update `.env`:
```env
# Email (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password

# SMS (Twilio - Optional)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 🧪 Test Your Setup

### Step 1: Test MongoDB Connection

Create a test file `backend/test-mongo.js`:

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');

    // Test creating a simple document
    const TestSchema = new mongoose.Schema({ name: String, test: Boolean });
    const TestModel = mongoose.model('Test', TestSchema);

    const testDoc = new TestModel({ name: 'Connection Test', test: true });
    await testDoc.save();
    console.log('✅ Test document created!');

    // Clean up
    await TestModel.deleteOne({ name: 'Connection Test' });
    console.log('✅ Test document cleaned up!');

    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected successfully!');
    console.log('\n🎉 MongoDB setup is working perfectly!');

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure MongoDB service is running: net start MongoDB');
    console.log('2. Check your MONGODB_URI in .env file');
    console.log('3. For Atlas: Verify username/password and IP whitelist');
  }
}

testConnection();
```

Run the test:
```bash
cd backend
node test-mongo.js
```

### Step 2: Start the Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 5000
Environment: development
MongoDB connected successfully
```

### Step 3: Test API Endpoints

**Test Health Check:**
```bash
curl http://localhost:5000/api/health
# Should return: {"status":"OK","timestamp":"2024-..."}
```

**Test User Registration:**
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

---

## 🖥️ MongoDB GUI Tools

### MongoDB Compass (Recommended)
1. Install during MongoDB setup
2. Connect to: `mongodb://localhost:27017`
3. Explore your `abhivriddhi` database
4. View collections: `users`, `otps`

### Alternative: Studio 3T
- Download from: https://studio3t.com/download/
- Free community edition available

---

## 📊 Understanding Your Data Structure

### User Collection (like Firebase Collection)
```javascript
{
  "_id": ObjectId("507f1f77bcf86cd799439011"), // Auto-generated
  "name": "John Doe",
  "email": "john@example.com",
  "mobile": "+919876543210",
  "password": "$2a$12$...", // Hashed
  "isVerified": false,
  "emailVerified": false,
  "mobileVerified": false,
  "role": "user",
  "addresses": [],
  "cart": [],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### OTP Collection
```javascript
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "identifier": "john@example.com",
  "type": "email",
  "otp": "123456",
  "purpose": "registration",
  "attempts": 0,
  "isVerified": false,
  "expireAt": "2024-01-01T00:10:00.000Z", // Auto-deletes
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔧 Common Issues & Solutions

### Issue: "MongoDB service not starting"
**Solution:**
```bash
# Run Command Prompt as Administrator
net start MongoDB
```

### Issue: "Connection refused"
**Solutions:**
1. Check if MongoDB is running: `net start MongoDB`
2. Verify connection string in `.env`
3. For Atlas: Check IP whitelist and credentials

### Issue: "Authentication failed"
**Solutions:**
1. For Atlas: Verify username/password
2. Check if user has correct permissions
3. Ensure database name is correct

### Issue: "Email not sending"
**Solutions:**
1. Verify Gmail app password (not regular password)
2. Check if 2FA is enabled
3. Try a different email provider

---

## 🚀 Next Steps After Setup

1. **Test all API endpoints** with Postman
2. **Update frontend** to connect to backend APIs
3. **Implement user authentication** in React app
4. **Add cart persistence** to MongoDB
5. **Create order management** system

---

## 📞 Need Help?

If you get stuck:
1. Check the server logs: `npm run dev`
2. Test MongoDB connection: `node test-mongo.js`
3. Verify `.env` configuration
4. Use MongoDB Compass to inspect data

Your backend is production-ready once MongoDB is connected! 🎉