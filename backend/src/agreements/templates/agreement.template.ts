export function generateAgreementHtml(data: {
    agreementNumber: string;
    signedDate: string;
    // Owner details
    ownerName: string;
    ownerAddress: string;
    ownerPhone: string;
    ownerEmail: string;
    // Tenant details
    tenantName: string;
    tenantFatherName: string;
    tenantAddress: string;
    tenantPhone: string;
    tenantEmail: string;
    // Property details
    propertyName: string;
    propertyAddress: string;
    roomNumber: string;
    furnishing: string;
    // Terms
    startDate: string;
    endDate: string;
    monthlyRent: string;
    securityDeposit: string;
    maintenanceCharge: string;
    rentDueDay: number;
    lockInPeriodMonths: number;
    noticePeriodDays: number;
    rentEscalation: string;
    jurisdiction: string;
    additionalClauses: string[];
}): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rent Agreement - ${data.agreementNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      line-height: 1.8;
      padding: 40px 60px;
      font-size: 14px;
      color: #333;
    }
    h1 {
      text-align: center;
      font-size: 24px;
      margin-bottom: 30px;
      text-transform: uppercase;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    h2 {
      font-size: 16px;
      margin: 25px 0 15px 0;
      text-transform: uppercase;
    }
    .header-info {
      text-align: center;
      margin-bottom: 30px;
    }
    .agreement-no {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .section {
      margin-bottom: 20px;
    }
    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .party-box {
      width: 48%;
      border: 1px solid #ddd;
      padding: 15px;
      background: #f9f9f9;
    }
    .party-box h3 {
      font-size: 14px;
      margin-bottom: 10px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .party-box p {
      margin: 5px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    table th, table td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    table th {
      background: #f5f5f5;
      width: 40%;
    }
    .clause {
      margin: 10px 0;
      padding-left: 20px;
    }
    .clause-number {
      font-weight: bold;
      display: inline-block;
      width: 30px;
    }
    .signature-section {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      width: 45%;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 60px;
      padding-top: 10px;
    }
    .disclaimer {
      margin-top: 40px;
      padding: 15px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      font-size: 12px;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 11px;
      color: #666;
    }
    @media print {
      body {
        padding: 20px 40px;
      }
    }
  </style>
</head>
<body>
  <h1>Residential Rent Agreement</h1>
  
  <div class="header-info">
    <p class="agreement-no">Agreement No: ${data.agreementNumber}</p>
    <p>Date: ${data.signedDate}</p>
  </div>

  <div class="section">
    <p>This Rent Agreement is executed on <strong>${data.signedDate}</strong> at <strong>${data.jurisdiction}</strong></p>
  </div>

  <h2>Between the Parties</h2>
  <div class="parties">
    <div class="party-box">
      <h3>LANDLORD (First Party)</h3>
      <p><strong>Name:</strong> ${data.ownerName}</p>
      <p><strong>Address:</strong> ${data.ownerAddress}</p>
      <p><strong>Phone:</strong> ${data.ownerPhone}</p>
      <p><strong>Email:</strong> ${data.ownerEmail}</p>
    </div>
    <div class="party-box">
      <h3>TENANT (Second Party)</h3>
      <p><strong>Name:</strong> ${data.tenantName}</p>
      <p><strong>S/o, D/o:</strong> ${data.tenantFatherName}</p>
      <p><strong>Address:</strong> ${data.tenantAddress}</p>
      <p><strong>Phone:</strong> ${data.tenantPhone}</p>
      <p><strong>Email:</strong> ${data.tenantEmail}</p>
    </div>
  </div>

  <h2>Property Details</h2>
  <table>
    <tr>
      <th>Property Name</th>
      <td>${data.propertyName}</td>
    </tr>
    <tr>
      <th>Complete Address</th>
      <td>${data.propertyAddress}</td>
    </tr>
    <tr>
      <th>Room/Unit Number</th>
      <td>${data.roomNumber}</td>
    </tr>
    <tr>
      <th>Furnishing Status</th>
      <td>${data.furnishing}</td>
    </tr>
  </table>

  <h2>Rental Terms</h2>
  <table>
    <tr>
      <th>Tenancy Start Date</th>
      <td>${data.startDate}</td>
    </tr>
    <tr>
      <th>Tenancy End Date</th>
      <td>${data.endDate}</td>
    </tr>
    <tr>
      <th>Monthly Rent</th>
      <td>₹ ${data.monthlyRent}</td>
    </tr>
    <tr>
      <th>Security Deposit</th>
      <td>₹ ${data.securityDeposit}</td>
    </tr>
    <tr>
      <th>Monthly Maintenance</th>
      <td>₹ ${data.maintenanceCharge}</td>
    </tr>
    <tr>
      <th>Rent Due Day</th>
      <td>${data.rentDueDay}th of every month</td>
    </tr>
    <tr>
      <th>Lock-in Period</th>
      <td>${data.lockInPeriodMonths} months</td>
    </tr>
    <tr>
      <th>Notice Period</th>
      <td>${data.noticePeriodDays} days</td>
    </tr>
    <tr>
      <th>Annual Rent Escalation</th>
      <td>${data.rentEscalation}%</td>
    </tr>
  </table>

  <h2>Terms and Conditions</h2>
  
  <div class="clause">
    <span class="clause-number">1.</span>
    <strong>RENT PAYMENT:</strong> The Tenant agrees to pay the monthly rent of ₹${data.monthlyRent} (Rupees ${numberToWords(parseFloat(data.monthlyRent.replace(/,/g, '')))} only) to the Landlord on or before the ${data.rentDueDay}th day of each month. Payment shall be made via bank transfer, UPI, or cheque as mutually agreed.
  </div>

  <div class="clause">
    <span class="clause-number">2.</span>
    <strong>SECURITY DEPOSIT:</strong> The Tenant has paid a security deposit of ₹${data.securityDeposit} (Rupees ${numberToWords(parseFloat(data.securityDeposit.replace(/,/g, '')))} only) which shall be refunded within 30 days of vacating the premises, after deducting any outstanding dues or damages.
  </div>

  <div class="clause">
    <span class="clause-number">3.</span>
    <strong>LOCK-IN PERIOD:</strong> Neither party shall terminate this agreement during the lock-in period of ${data.lockInPeriodMonths} months from the commencement date, except in case of breach of terms.
  </div>

  <div class="clause">
    <span class="clause-number">4.</span>
    <strong>NOTICE PERIOD:</strong> After the lock-in period, either party may terminate this agreement by providing ${data.noticePeriodDays} days written notice to the other party.
  </div>

  <div class="clause">
    <span class="clause-number">5.</span>
    <strong>MAINTENANCE:</strong> The Tenant shall maintain the premises in good condition and shall be responsible for minor repairs up to ₹2,000. Major repairs and structural maintenance shall be the responsibility of the Landlord.
  </div>

  <div class="clause">
    <span class="clause-number">6.</span>
    <strong>USAGE:</strong> The premises shall be used solely for residential purposes by the Tenant and their immediate family. Subletting or commercial use is strictly prohibited without written consent.
  </div>

  <div class="clause">
    <span class="clause-number">7.</span>
    <strong>UTILITIES:</strong> The Tenant shall bear all costs for electricity, water, gas, internet, and other utility services used during the tenancy period.
  </div>

  <div class="clause">
    <span class="clause-number">8.</span>
    <strong>INSPECTION:</strong> The Landlord or their authorized representative may inspect the premises with 24 hours prior notice during reasonable hours.
  </div>

  <div class="clause">
    <span class="clause-number">9.</span>
    <strong>MODIFICATIONS:</strong> The Tenant shall not make any structural modifications or alterations to the premises without prior written consent from the Landlord.
  </div>

  <div class="clause">
    <span class="clause-number">10.</span>
    <strong>RENT ESCALATION:</strong> The monthly rent shall be increased by ${data.rentEscalation}% annually on the anniversary of this agreement.
  </div>

  ${data.additionalClauses.map((clause, i) => `
  <div class="clause">
    <span class="clause-number">${11 + i}.</span>
    ${clause}
  </div>
  `).join('')}

  <div class="clause">
    <span class="clause-number">${11 + data.additionalClauses.length}.</span>
    <strong>JURISDICTION:</strong> Any disputes arising from this agreement shall be subject to the exclusive jurisdiction of courts in <strong>${data.jurisdiction}</strong>.
  </div>

  <div class="clause">
    <span class="clause-number">${12 + data.additionalClauses.length}.</span>
    <strong>ENTIRE AGREEMENT:</strong> This agreement constitutes the entire understanding between the parties and supersedes all prior negotiations, representations, or agreements.
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">
        <p><strong>LANDLORD</strong></p>
        <p>${data.ownerName}</p>
        <p>Date: _______________</p>
      </div>
    </div>
    <div class="signature-box">
      <div class="signature-line">
        <p><strong>TENANT</strong></p>
        <p>${data.tenantName}</p>
        <p>Date: _______________</p>
      </div>
    </div>
  </div>

  <div class="signature-section" style="margin-top: 40px;">
    <div class="signature-box">
      <div class="signature-line">
        <p><strong>WITNESS 1</strong></p>
        <p>Name: _______________</p>
        <p>Address: _______________</p>
      </div>
    </div>
    <div class="signature-box">
      <div class="signature-line">
        <p><strong>WITNESS 2</strong></p>
        <p>Name: _______________</p>
        <p>Address: _______________</p>
      </div>
    </div>
  </div>

  <div class="disclaimer">
    <strong>⚠️ DISCLAIMER:</strong> This agreement is system-generated and provided for informational purposes only. 
    It is recommended to have this document reviewed by a legal professional and registered as per applicable state laws. 
    Stamp duty and registration requirements vary by state. The parties should ensure compliance with the local 
    Registration Act and Stamp Act.
  </div>

  <div class="footer">
    <p>Generated by Rental Property Management System | Agreement ID: ${data.agreementNumber}</p>
    <p>This document requires proper stamp duty and registration as per applicable state laws.</p>
  </div>
</body>
</html>
  `;
}

function numberToWords(num: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero';

    function convert(n: number): string {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
        if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
        return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    }

    return convert(Math.floor(num));
}
