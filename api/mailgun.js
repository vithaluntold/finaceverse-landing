// Mailgun Newsletter Integration API
// This file handles newsletter subscriptions via Mailgun

const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);

// Initialize Mailgun client
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
  url: 'https://api.mailgun.net'
});

const MAILING_LIST = process.env.MAILGUN_MAILING_LIST || 'newsletter@finaceverse.io';
const DOMAIN = process.env.MAILGUN_DOMAIN || 'finaceverse.io';

/**
 * Subscribe email to newsletter
 */
async function subscribe(email, name = '') {
  try {
    const result = await mg.lists.members.createMember(MAILING_LIST, {
      address: email,
      name: name,
      subscribed: 'yes',
      upsert: 'yes'
    });
    
    return {
      success: true,
      message: 'Successfully subscribed to newsletter',
      data: result
    };
  } catch (error) {
    console.error('Mailgun subscription error:', error);
    return {
      success: false,
      message: error.message || 'Failed to subscribe'
    };
  }
}

/**
 * Unsubscribe email from newsletter
 */
async function unsubscribe(email) {
  try {
    await mg.lists.members.destroyMember(MAILING_LIST, email);
    
    return {
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    };
  } catch (error) {
    console.error('Mailgun unsubscribe error:', error);
    return {
      success: false,
      message: error.message || 'Failed to unsubscribe'
    };
  }
}

/**
 * Get subscriber status
 */
async function getSubscriberStatus(email) {
  try {
    const member = await mg.lists.members.getMember(MAILING_LIST, email);
    
    return {
      success: true,
      subscribed: member.subscribed === 'yes',
      data: member
    };
  } catch (error) {
    if (error.status === 404) {
      return {
        success: true,
        subscribed: false
      };
    }
    return {
      success: false,
      message: error.message
    };
  }
}

// Serverless function handler for API routes
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { action, email, name } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ 
      success: false, 
      message: 'Valid email is required' 
    });
  }
  
  let result;
  
  switch (action) {
    case 'subscribe':
      result = await subscribe(email, name);
      break;
      
    case 'unsubscribe':
      result = await unsubscribe(email);
      break;
      
    case 'status':
      result = await getSubscriberStatus(email);
      break;
      
    default:
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid action. Use: subscribe, unsubscribe, or status' 
      });
  }
  
  return res.status(result.success ? 200 : 400).json(result);
};

// Export functions for direct use
module.exports.subscribe = subscribe;
module.exports.unsubscribe = unsubscribe;
module.exports.getSubscriberStatus = getSubscriberStatus;
