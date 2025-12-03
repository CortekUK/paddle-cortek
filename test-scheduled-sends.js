// Test script to manually trigger run-scheduled-sends-v2 function
const SUPABASE_URL = 'https://dygljrvbxvbrqrihrxyn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Z2xqcnZieHZicnFyaWhyeHluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEyODU2OCwiZXhwIjoyMDcxNzA0NTY4fQ.dciy8xhvmrCX4lJsgaD3TddIgCYCDkhNXDGNp3tzmP0';

async function testScheduledSends() {
  try {
    console.log('Testing run-scheduled-sends-v2 function...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/run-scheduled-sends-v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', result);
    
    if (response.ok) {
      console.log('✅ Function executed successfully!');
    } else {
      console.log('❌ Function failed:', response.status, result);
    }
    
  } catch (error) {
    console.error('❌ Error calling function:', error);
  }
}

testScheduledSends();
