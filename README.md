# Abhivriddhi Organics Backend API

A comprehensive backend API for the Abhivriddhi Organics e-commerce platform with OTP-based authentication for email and mobile.

## Features

- 🔐 **OTP Authentication**: Email and SMS OTP for registration and login
- 👤 **User Management**: Profile management, addresses, password change
- 🛡️ **Security**: JWT tokens, password hashing, rate limiting
- 📧 **Email Service**: OTP delivery via email with HTML templates
- 📱 **SMS Service**: OTP delivery via Twilio
- 🗄️ **MongoDB**: User data and OTP storage
- ⚡ **Express.js**: Fast and scalable API server

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Nodemailer
- **SMS**: Twilio
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **Password Hashing**: bcryptjs

## Prerequisites

Before running this application, make sure you have:

1. **Node.js** (v16 or higher)
2. **MongoDB** (local installation or MongoDB Atlas)
3. **Email Account** (Gmail recommended for SMTP)
4. **Twilio Account** (for SMS functionality)

## Installation

1. **Clone and navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Copy `.env` file and update the values:
   ```bash
   cp .env .env.local
   ```

   Update the following variables in `.env`:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/abhivriddhi

   # JWT
   JWT_SECRET=your_super_secret_jwt_key_here_change_in_production

   # Email Configuration
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

4. **Start MongoDB:**
   Make sure MongoDB is running on your system.

5. **Run the server:**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication Routes

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "mobile": "+919876543210",
  "password": "password123"
}
```

#### Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "identifier": "john@example.com",
  "type": "email",
  "purpose": "login"
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "identifier": "john@example.com",
  "otp": "123456",
  "type": "email",
  "purpose": "login"
}
```

#### Login with Password
```http
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <jwt_token>
```

### User Management Routes

#### Update Profile
```http
PUT /api/users/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "John Smith",
  "email": "johnsmith@example.com"
}
```

#### Change Password
```http
PUT /api/users/change-password
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

#### Add Address
```http
POST /api/users/addresses
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "type": "home",
  "name": "John Doe",
  "mobile": "+919876543210",
  "addressLine1": "123 Main Street",
  "addressLine2": "Apartment 4B",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "isDefault": true
}
```

## Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  mobile: String (unique),
  password: String (hashed),
  isVerified: Boolean,
  emailVerified: Boolean,
  mobileVerified: Boolean,
  role: String (user/admin),
  addresses: [{
    type: String,
    name: String,
    mobile: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    isDefault: Boolean
  }],
  orders: [ObjectId],
  wishlist: [ObjectId],
  cart: [{
    product: ObjectId,
    quantity: Number,
    weight: String,
    addedAt: Date
  }]
}
```

### OTP Model
```javascript
{
  identifier: String, // email or mobile
  type: String, // 'email' or 'mobile'
  otp: String,
  purpose: String, // 'registration', 'login', 'verification'
  attempts: Number,
  isVerified: Boolean,
  expireAt: Date (TTL index)
}
```

## Authentication Flow

### Registration Flow
1. User submits registration form
2. System creates user record (unverified)
3. OTP sent to both email and mobile
4. User verifies both email and mobile OTP
5. Account becomes fully verified
6. JWT token issued for authentication

### Login Flow (OTP)
1. User enters email/mobile
2. System sends OTP to chosen method
3. User enters OTP
4. System verifies OTP
5. JWT token issued for authentication

### Login Flow (Password)
1. User enters email/mobile and password
2. System verifies credentials
3. JWT token issued for authentication

## Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: Secure token-based authentication
- **Rate Limiting**: Prevents OTP spam (5 requests per 5 minutes)
- **Input Validation**: Comprehensive validation using express-validator
- **CORS**: Configured for frontend origin
- **Helmet**: Security headers
- **OTP Expiration**: 10 minutes expiry with auto-cleanup

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed validation errors"] // for validation errors
}
```

## Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (jest)

### Project Structure
```
backend/
├── models/           # Database models
│   ├── User.js      # User schema
│   └── OTP.js       # OTP schema
├── routes/          # API routes
│   ├── auth.js      # Authentication routes
│   └── users.js     # User management routes
├── utils/           # Utility functions
│   ├── emailService.js
│   ├── smsService.js
│   └── jwt.js
├── middleware/      # Express middleware
│   └── auth.js      # Authentication middleware
├── server.js        # Main server file
├── package.json
├── .env            # Environment variables
└── README.md
```

## Deployment

1. Set up production MongoDB database
2. Configure production environment variables
3. Set up reverse proxy (nginx recommended)
4. Enable SSL/TLS
5. Configure proper CORS origins
6. Set strong JWT secret
7. Enable production logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support, please contact the development team or create an issue in the repository.