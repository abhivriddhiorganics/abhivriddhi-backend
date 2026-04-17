const mongoose = require('mongoose');

const SiteSettingsSchema = new mongoose.Schema({
  announcementBar: {
    type: [String],
    default: [
      '100% Organic',
      'Gluten Free',
      'Chemical Free',
      'No Sugar Added'
    ]
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SiteSettings', SiteSettingsSchema);
