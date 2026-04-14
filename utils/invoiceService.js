const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');


/**
 * Invoice Service — generates Amazon-style Tax Invoice.
 */

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const amount = Math.floor(num);
  if (amount === 0) return 'Zero only';
  
  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    return '';
  };

  const handleBig = (n) => {
    let str = '';
    if (n >= 10000000) {
      str += convert(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      str += convert(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      str += convert(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (n > 0) {
      str += convert(n);
    }
    return str.trim() + ' only';
  };

  return handleBig(amount);
};

const generateInvoiceHTML = (order) => {
  const orderId = String(order._id).slice(-8).toUpperCase();
  const sa = order.shippingAddress || {};
  const date = new Date(order.createdAt || Date.now()).toLocaleDateString('en-GB');
  
  // Logo Processing (Restored Local Logo for Branding)
  let logoBase64 = '';
  try {
    const logoPath = path.join(__dirname, 'logo.png');
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;
    }
  } catch (err) {
    console.error('❌ [Logo] Error reading local logo file:', err.message);
  }

  // Final Logo Asset
  const invoiceLogo = logoBase64 || 'https://i.ibb.co/vzB7pBq/abhivriddhi-logo.png';
  const gstRate = 0.05;
  const netTotal = order.totalAmount / (1 + gstRate);
  const totalTax = order.totalAmount - netTotal;
  const halfTax = totalTax / 2;

  const itemsRows = (order.orderItems || []).map((item, i) => {
    const itemTotal = item.price * item.quantity;
    const itemNet = itemTotal / (1 + gstRate);
    const itemTax = itemTotal - itemNet;
    const itemHalfTax = itemTax / 2;
    
    return `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="width: 30px; text-align: center; border-right: 1px solid #ddd; padding: 5px;">${i + 1}</td>
        <td style="padding: 5px; border-right: 1px solid #ddd;">
          <strong>${item.name}</strong><br>
          <span style="font-size: 10px; color: #555;">HSN: 15159091</span>
        </td>
        <td style="width: 70px; text-align: right; padding: 5px; border-right: 1px solid #ddd;">₹${(item.price / (1+gstRate)).toFixed(2)}</td>
        <td style="width: 50px; text-align: right; padding: 5px; border-right: 1px solid #ddd;">₹0.00</td>
        <td style="width: 30px; text-align: center; padding: 5px; border-right: 1px solid #ddd;">${item.quantity}</td>
        <td style="width: 70px; text-align: right; padding: 5px; border-right: 1px solid #ddd;">₹${itemNet.toFixed(2)}</td>
        <td style="width: 40px; text-align: right; padding: 5px; border-right: 1px solid #ddd;">2.5%</td>
        <td style="width: 40px; text-align: center; padding: 5px; border-right: 1px solid #ddd;">CGST</td>
        <td style="width: 70px; text-align: right; padding: 5px; border-right: 1px solid #ddd;">₹${itemHalfTax.toFixed(2)}</td>
        <td style="width: 80px; text-align: right; padding: 5px;">₹${itemTotal.toLocaleString('en-IN')}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td colspan="6" style="border-right: 1px solid #ddd;"></td>
        <td style="width: 40px; text-align: right; padding: 5px; border-right: 1px solid #ddd;">2.5%</td>
        <td style="width: 40px; text-align: center; padding: 5px; border-right: 1px solid #ddd;">SGST</td>
        <td style="width: 70px; text-align: right; padding: 5px; border-right: 1px solid #ddd;">₹${itemHalfTax.toFixed(2)}</td>
        <td style="border-right: none;"></td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 0; background: #fff; line-height: 1.4; }
    .page { padding: 30px; }
    .container { width: 100%; border: 1px solid #ddd; padding: 20px; position: relative; }
    
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; border-bottom: 2px solid #1a3d0c; padding-bottom: 15px; }
    .logo h1 { color: #1a3d0c; margin: 0; font-size: 24px; display: flex; align-items: center; gap: 10px; }
    .logo p { font-size: 10px; color: #4a7c23; margin: 2px 0 0; font-weight: bold; }
    
    .invoice-title { text-align: right; }
    .invoice-title h1 { margin: 0; font-size: 16px; font-weight: bold; color: #1a3d0c; text-transform: uppercase; }
    .invoice-title p { margin: 2px 0; font-size: 10px; color: #666; }

    .address-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .seller-info { width: 48%; }
    .buyer-info { width: 48%; text-align: right; }
    .info-title { font-weight: bold; margin-bottom: 4px; display: block; color: #1a3d0c; text-transform: uppercase; font-size: 10px; }

    .order-details { display: flex; justify-content: space-between; margin-bottom: 15px; background: #f0f7e8; padding: 10px; border: 1px solid #c2d6b2; }
    
    table { width: 100%; border-collapse: collapse; border: 1px solid #ddd; margin-bottom: 15px; table-layout: fixed; }
    thead th { background: #1a3d0c; border: 1px solid #1a3d0c; padding: 8px 4px; font-size: 9px; text-align: center; text-transform: uppercase; color: #fff; }
    
    tbody td { border: 1px solid #eee; word-wrap: break-word; vertical-align: top; }

    .total-section { display: flex; justify-content: space-between; border: 1px solid #ddd; padding: 12px; background: #fafafa; }
    .amount-words { width: 55%; font-style: italic; font-size: 10px; }
    .final-totals { width: 40%; text-align: right; }
    
    .signature-area { margin-top: 20px; text-align: right; }
    .sig-box { border: 1px solid #ddd; padding: 20px 15px 5px; display: inline-block; min-width: 180px; text-align: center; background: #fff; }
    
    .footer { font-size: 9px; color: #777; margin-top: 20px; text-align: center; border-top: 1px dotted #ccc; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="container">
      <div class="header">
        <div class="logo">
          <img src="${invoiceLogo}" style="height: 65px; object-fit: contain;" />
          <p style="margin-top: 5px; color: #4a7c23; font-weight: bold;">Pure • Natural • Traditional</p>
        </div>
        <div class="invoice-title">
          <h1>Tax Invoice / Bill of Supply</h1>
          <p>(Original for Recipient)</p>
        </div>
      </div>

      <div class="address-section">
        <div class="seller-info">
          <span class="info-title">Sold By:</span>
          <strong>Abhivriddhi Organics Private Limited</strong><br>
          102, Green Valley Estate, B-Phase<br>
          Indore, MADHYA PRADESH, 452010, IN<br>
          <strong>PAN No:</strong> ABCPD1234F<br>
          <strong>GST Registration No:</strong> 23ABCPD1234F1Z1
        </div>
        <div class="buyer-info">
          <span class="info-title">Billing Address:</span>
          <strong>${sa.fullName || 'Customer'}</strong><br>
          ${sa.addressLine || ''}<br>
          ${sa.city || ''}, ${sa.state || ''}, ${sa.pincode || ''}, IN<br>
          <strong>State Code:</strong> 23<br><br>
          
          <span class="info-title">Shipping Address:</span>
          <strong>${sa.fullName || 'Customer'}</strong><br>
          ${sa.addressLine || ''}<br>
          ${sa.city || ''}, ${sa.state || ''}, ${sa.pincode || ''}, IN
        </div>
      </div>

    <div class="order-details">
      <div>
        <strong>Order Number:</strong> ${orderId}<br>
        <strong>Order Date:</strong> ${date}
      </div>
      <div style="text-align: right;">
        <strong>Invoice Number:</strong> INV-${orderId}<br>
        <strong>Invoice Date:</strong> ${date}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Sl. No</th>
          <th>Description</th>
          <th>Unit Price</th>
          <th>Discount</th>
          <th>Qty</th>
          <th>Net Amount</th>
          <th>Tax Rate</th>
          <th>Tax Type</th>
          <th>Tax Amount</th>
          <th>Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
        <tr style="background: #eee; font-weight: bold; border-top: 2px solid #000;">
          <td colspan="8" style="text-align: right; padding: 10px; border-right: 1px solid #ddd;">TOTAL:</td>
          <td style="text-align: right; padding: 10px; border-right: 1px solid #ddd;">₹${totalTax.toFixed(2)}</td>
          <td style="text-align: right; padding: 10px;">₹${order.totalAmount.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-section">
      <div class="amount-words">
        <strong>Amount in Words:</strong><br>
        ${numberToWords(order.totalAmount)}
      </div>
      <div class="final-totals">
        <label>For Abhivriddhi Organics Private Limited:</label><br><br>
        <div class="sig-box">
          <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/Signature_of_Ratan_Tata.png" style="height: 30px; opacity: 0.6;" /><br>
          <strong>Authorized Signatory</strong>
        </div>
      </div>
    </div>

    <div class="footer">
      This is an electronically generated invoice. No physical signature is required.<br>
      Abhivriddhi Organics | Pure Organic Grains & Spices | Indore, India
    </div>
  </div>
</body>
</html>`;
};

const generateInvoicePDF = async (order) => {
  const html = generateInvoiceHTML(order);
  let browser = null;

  try {
    /* --- BROWSER OPTIMIZATION FOR CLOUD --- */
    let puppeteerLib = require('puppeteer');
    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
        console.log('[Invoice] Cloud environment detected. Using @sparticuz/chromium...');
        try {
            const chromium = require('@sparticuz/chromium');
            puppeteerLib = require('puppeteer-core');
            executablePath = await chromium.executablePath();
        } catch (err) {
            console.warn('[Invoice] Failed to load @sparticuz/chromium, falling back to default puppeteer.');
        }
    }
    /* -------------------------------------- */

    browser = await puppeteerLib.launch({
      headless: true, // @sparticuz/chromium works best with true
      executablePath: executablePath,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--no-zygote',
        '--disable-gpu',
        '--single-process',
        '--disable-software-rasterizer',
        '--no-first-run',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        ...((process.env.NODE_ENV === 'production' || process.env.RENDER) ? require('@sparticuz/chromium').args : [])
      ],
      timeout: 120000 
    });
    
    const page = await browser.newPage();
    
    // Use a shorter timeout for navigation
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    console.log(`✅ [Invoice] PDF generated successfully for Order: ${order._id}`);
    return pdfBuffer;
  } catch (error) {
    console.error('❌ [Invoice] PDF Generation Error:', error.message);
    // If PDF fails, we return null to signal the route to fallback to HTML
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

module.exports = { generateInvoiceHTML, generateInvoicePDF };
