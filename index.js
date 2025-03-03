require("dotenv").config(); // Load environment variables
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // Initialize Stripe with secret key

const app = express();
app.use(express.json()); // Parse JSON bodies

// Route to create a payment intent
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body;

    // Validate input
    if (!amount || isNaN(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ error: "Invalid amount. Please provide a positive number." });
    }

    const amountInCents = Math.round(parseFloat(amount) * 100); // Convert to cents
    if (amountInCents < 50) {
      // Stripe minimum amount is typically 50 cents in USD
      return res
        .status(400)
        .json({ error: "Amount must be at least $0.50 USD." });
    }

    // Create a PaymentIntent with the specified amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      payment_method_types: ["card"],
    });

    // Send the client secret and additional info to the frontend
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: amount,
      paymentIntentId: paymentIntent.id, // Useful for tracking
    });
  } catch (error) {
    console.error("Error creating payment intent:", error.message);
    res.status(500).json({
      error: "Payment intent creation failed",
      details: error.message,
    });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
