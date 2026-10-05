const BASE_URL = 'http://localhost:3005';

async function request(path: string, options: any = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
  });
  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function runLiveIntegrationTest() {
  console.log('🚀 Starting FleetLink Live API End-to-End Integration Test...');
  console.log(`📡 Target API Gateway: ${BASE_URL}\n`);

  let apexToken = '';
  let apexOrgId = '';
  let metroToken = '';
  let metroOrgId = '';
  let createdVehicleId = '';
  let createdCustomerId = '';
  let createdBookingId = '';
  let partnerRequestId = '';
  let partnerOfferId = '';
  let partnerRentalId = '';

  // 1. AUTHENTICATION & SESSION
  console.log('1️⃣ Testing Authentication & Token Lifecycle...');
  try {
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'owner@apexrentals.com',
        password: 'Fleet2026!Secure',
      },
    });
    console.log('   ✅ Apex Owner Login:', loginRes.success);
    apexToken = loginRes.data.tokens.accessToken;
    apexOrgId = loginRes.data.organizations[0].id;

    // Login Metro Owner for B2B testing
    const metroLogin = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'owner@metrofleet.com',
        password: 'Fleet2026!Secure',
      },
    });
    console.log('   ✅ Metro Owner Login:', metroLogin.success);
    metroToken = metroLogin.data.tokens.accessToken;
    metroOrgId = metroLogin.data.organizations[0].id;

    // Test /api/auth/me
    const meRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${apexToken}`, 'x-organization-id': apexOrgId },
    });
    console.log(`   ✅ Session Verification: Verified ${meRes.data.email} (${meRes.data.role})`);

    // Test Token Refresh
    const refreshRes = await request('/api/auth/refresh', {
      method: 'POST',
      body: {
        refreshToken: loginRes.data.tokens.refreshToken,
      },
    });
    console.log('   ✅ Token Refresh:', refreshRes.success);
    apexToken = refreshRes.data.accessToken;
  } catch (err: any) {
    console.error('   ❌ Auth Error:', err.message);
    process.exit(1);
  }

  const apexHeaders = {
    Authorization: `Bearer ${apexToken}`,
    'x-organization-id': apexOrgId,
  };

  const metroHeaders = {
    Authorization: `Bearer ${metroToken}`,
    'x-organization-id': metroOrgId,
  };

  // 2. DASHBOARD
  console.log('\n2️⃣ Testing Enterprise Dashboard Summary...');
  try {
    const dashRes = await request('/api/internal/dashboard/summary', { headers: apexHeaders });
    const fs = dashRes.data?.fleetSummary;
    const fin = dashRes.data?.financialMetrics;
    console.log('   ✅ Dashboard Metrics:', {
      totalVehicles: fs?.totalVehicles,
      availableVehicles: fs?.availableVehicles,
      directRentals: fs?.directRentals,
      partnerRentals: fs?.partnerRentals,
      monthRevenue: fin?.totalMonthlyRevenue,
    });
  } catch (err: any) {
    console.error('   ❌ Dashboard Error:', err.message);
    process.exit(1);
  }

  // 3. VEHICLES CRUD
  console.log('\n3️⃣ Testing Vehicles Management...');
  try {
    const listRes = await request('/api/internal/vehicles', { headers: apexHeaders });
    console.log(`   ✅ Fetched ${listRes.data.length} vehicles from catalog`);

    const addRes = await request('/api/internal/vehicles', {
      method: 'POST',
      headers: apexHeaders,
      body: {
        registrationNumber: `POR-${Math.floor(1000 + Math.random() * 9000)}`,
        make: 'Porsche',
        model: '911 GT3 RS',
        year: 2025,
        category: 'LUXURY',
        dailyRate: 450.0,
        partnerDailyRate: 350.0,
        mileage: 1200,
        fuelType: 'PETROL',
        transmission: 'AUTOMATIC',
        seats: 2,
        status: 'AVAILABLE',
      },
    });
    createdVehicleId = addRes.data.id;
    console.log(`   ✅ Created Vehicle: ${addRes.data.make} ${addRes.data.model} (ID: ${createdVehicleId})`);

    const detailRes = await request(`/api/internal/vehicles/${createdVehicleId}`, {
      headers: apexHeaders,
    });
    console.log(`   ✅ Vehicle Detail: ${detailRes.data.registrationNumber} - Daily Rate: $${detailRes.data.dailyRate}`);
  } catch (err: any) {
    console.error('   ❌ Vehicles Error:', err.message);
    process.exit(1);
  }

  // 4. CUSTOMERS CRM
  console.log('\n4️⃣ Testing Customers CRM...');
  try {
    const custRes = await request('/api/internal/customers', {
      method: 'POST',
      headers: apexHeaders,
      body: {
        firstName: 'Johnathan',
        lastName: 'Wick',
        phone: '+14155557788',
        email: `john.wick.${Date.now()}@continental.com`,
        address: '1 Wall Street, New York, NY 10005',
        drivingLicenceNumber: 'NY-DL-994411',
      },
    });
    createdCustomerId = custRes.data.id;
    console.log(`   ✅ Created Customer Profile: ${custRes.data.firstName} ${custRes.data.lastName} (ID: ${createdCustomerId})`);
  } catch (err: any) {
    console.error('   ❌ Customers Error:', err.message);
    process.exit(1);
  }

  // 5. DIRECT BOOKING LIFECYCLE
  console.log('\n5️⃣ Testing Complete Direct Booking Lifecycle...');
  try {
    const startDate = new Date(Date.now() + 86400000 * 2).toISOString();
    const endDate = new Date(Date.now() + 86400000 * 5).toISOString();

    const bookingRes = await request('/api/internal/bookings', {
      method: 'POST',
      headers: apexHeaders,
      body: {
        customerProfileId: createdCustomerId,
        vehicleId: createdVehicleId,
        pickupDateTime: startDate,
        returnDateTime: endDate,
        pickupLocation: 'Apex LAX Terminal Hub',
        returnLocation: 'Apex LAX Terminal Hub',
        dailyRate: 450.0,
        numberOfDays: 3,
        depositAmount: 500.0,
        discountAmount: 0.0,
        notes: 'VIP customer. Vehicle prepared with full tank.',
      },
    });
    createdBookingId = bookingRes.data.id;
    console.log(`   ✅ Booking Created: ${bookingRes.data.bookingNumber} | Total: $${bookingRes.data.totalAmount}`);

    // Pickup inspection
    const inspectPickup = await request('/api/internal/inspections', {
      method: 'POST',
      headers: apexHeaders,
      body: {
        vehicleId: createdVehicleId,
        bookingId: createdBookingId,
        type: 'DIRECT_PICKUP',
        mileage: 1200,
        fuelLevel: '100%',
        overallCondition: 'EXCELLENT',
        notes: 'Flawless condition at handover',
      },
    });
    console.log(`   ✅ Direct Pickup Inspection Submitted (ID: ${inspectPickup.data.id})`);

    // Update status to PICKED_UP
    await request(`/api/internal/bookings/${createdBookingId}/status`, {
      method: 'PUT',
      headers: apexHeaders,
      body: { status: 'PICKED_UP', pickupMileage: 1200, pickupFuelLevel: '100%' },
    });
    console.log('   ✅ Booking Status updated to PICKED_UP');

    // Return inspection
    const inspectReturn = await request('/api/internal/inspections', {
      method: 'POST',
      headers: apexHeaders,
      body: {
        vehicleId: createdVehicleId,
        bookingId: createdBookingId,
        type: 'DIRECT_RETURN',
        mileage: 1450,
        fuelLevel: '100%',
        overallCondition: 'GOOD',
        notes: 'Clean return. No damages.',
      },
    });
    console.log(`   ✅ Direct Return Inspection Submitted (ID: ${inspectReturn.data.id})`);

    // Update status to RETURNED
    await request(`/api/internal/bookings/${createdBookingId}/status`, {
      method: 'PUT',
      headers: apexHeaders,
      body: { status: 'RETURNED', returnMileage: 1450, returnFuelLevel: '100%' },
    });
    console.log('   ✅ Booking Status updated to RETURNED');
  } catch (err: any) {
    console.error('   ❌ Bookings Error:', err.message);
    process.exit(1);
  }

  // 6. B2B PARTNER NETWORK LIFECYCLE
  console.log('\n6️⃣ Testing B2B Partner Wholesale Network...');
  try {
    // 1. Directory
    const dirRes = await request('/api/partner/partners', { headers: apexHeaders });
    console.log(`   ✅ Partner Directory: Found ${dirRes.data.length} trusted rental partners`);

    // 2. Broadcast Sourcing Request from Apex
    const reqRes = await request('/api/partner/requests', {
      method: 'POST',
      headers: apexHeaders,
      body: {
        vehicleCategory: 'SEDAN',
        targetWholesaleRate: 50.0,
        pickupDateTime: new Date(Date.now() + 86400000 * 30).toISOString(),
        returnDateTime: new Date(Date.now() + 86400000 * 34).toISOString(),
        pickupLocation: 'Downtown LA Partner Hub',
        returnLocation: 'Downtown LA Partner Hub',
        notes: 'Overflow request for corporate client',
      },
    });
    partnerRequestId = reqRes.data.id;
    console.log(`   ✅ Partner Request Broadcasted (ID: ${partnerRequestId})`);

    // 3. Metro Fleet creates a fresh vehicle and submits wholesale offer
    const metroVehicleRes = await request('/api/internal/vehicles', {
      method: 'POST',
      headers: metroHeaders,
      body: {
        registrationNumber: `MET-${Math.floor(1000 + Math.random() * 9000)}`,
        make: 'Toyota',
        model: 'Camry Hybrid',
        year: 2024,
        category: 'SEDAN',
        dailyRate: 65.0,
        partnerDailyRate: 48.0,
        mileage: 15000,
        fuelType: 'HYBRID',
        transmission: 'AUTOMATIC',
        seats: 5,
        status: 'AVAILABLE',
      },
    });
    const metroCarId = metroVehicleRes.data.id;

    const offerRes = await request('/api/partner/offers', {
      method: 'POST',
      headers: metroHeaders,
      body: {
        requestId: partnerRequestId,
        vehicleId: metroCarId,
        dailyRate: 48.0,
        depositAmount: 200.0,
        notes: 'Clean vehicle available for immediate dispatch',
      },
    });
    partnerOfferId = offerRes.data.id;
    console.log(`   ✅ Metro Submitted Wholesale Offer: $48/day (ID: ${partnerOfferId})`);

    // 4. Apex accepts offer -> creates PartnerRental
    const acceptRes = await request(`/api/partner/offers/${partnerOfferId}/accept`, {
      method: 'POST',
      headers: apexHeaders,
    });
    partnerRentalId = acceptRes.data.id;
    console.log(`   ✅ Apex Accepted Offer! Partner Rental Created (ID: ${partnerRentalId})`);

    // 5. Handover inspection (performed by Supplying Partner - Metro)
    await request(`/api/partner/rentals/${partnerRentalId}/handover`, {
      method: 'POST',
      headers: metroHeaders,
      body: {
        handoverMileage: 38500,
        handoverFuelLevel: 'FULL',
        notes: 'Handover complete between Metro and Apex reps',
      },
    });
    console.log('   ✅ Partner Handover Inspection completed');

    // 6. Return & Settle
    await request(`/api/partner/rentals/${partnerRentalId}/return`, {
      method: 'POST',
      headers: metroHeaders,
      body: {
        returnMileage: 38800,
        returnFuelLevel: 'FULL',
        notes: 'Returned in full working condition',
      },
    });
    console.log('   ✅ Partner Return Completed');

    await request(`/api/partner/rentals/${partnerRentalId}/settle`, {
      method: 'POST',
      headers: metroHeaders,
      body: {
        amount: 192.0,
        paymentMethod: 'BANK_TRANSFER',
        notes: 'Settled in full via B2B wire',
      },
    });
    console.log('   ✅ Partner Rental Settled');
  } catch (err: any) {
    console.error('   ❌ Partner Network Error:', err.message);
    process.exit(1);
  }

  // 7. FINANCE, DEPOSITS & SETTINGS
  console.log('\n7️⃣ Testing Finance, Deposits & Settings...');
  try {
    const finSummary = await request('/api/internal/finance/summary', { headers: apexHeaders });
    console.log('   ✅ Finance Summary:', {
      grossIncome: finSummary.data.grossIncome,
      totalExpenses: finSummary.data.totalExpenses,
      netProfit: finSummary.data.netProfit,
      cautionEscrowHeld: finSummary.data.cautionEscrowHeld,
    });

    const settingsRes = await request('/api/internal/settings', { headers: apexHeaders });
    console.log('   ✅ Organization Settings:', {
      currency: settingsRes.data.currency,
      timezone: settingsRes.data.timezone,
      defaultDepositValue: settingsRes.data.defaultDepositValue,
    });

    const reportsRes = await request('/api/internal/reports/comprehensive', { headers: apexHeaders });
    console.log('   ✅ Comprehensive Reports Generated:', {
      period: reportsRes.data.period,
      totalRentals: reportsRes.data.financialSummary?.totalRentals,
    });
  } catch (err: any) {
    console.error('   ❌ Finance/Settings Error:', err.message);
    process.exit(1);
  }

  console.log('\n🎉 =========================================================');
  console.log('🎉 ALL LIVE API INTEGRATION TESTS PASSED 100% SUCCESSFULLY!');
  console.log('🎉 Flutter Mobile App is Ready to Connect Directly to NestJS!');
  console.log('=========================================================\n');
}

runLiveIntegrationTest();
