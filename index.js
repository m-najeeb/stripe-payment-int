// Load environment variables from .env file
require("dotenv").config();

// Import required dependencies
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Initialize Express application
const app = express();

// Middleware setup
app.use(express.json()); // Enable JSON body parsing
app.use(express.static("public")); // Serve static files from 'public' directory

// Constants
const MINIMUM_AMOUNT_CENTS = 50; // Stripe's minimum transaction amount in cents ($0.50 USD)
const DEFAULT_PORT = 5000;

/**
 * Validates the payment amount received from the request
 * @param {number|string} amount - The amount to validate
 * @returns {object|null} - Error object if invalid, null if valid
 */
const validatePaymentAmount = (amount) => {
  if (!amount || isNaN(amount) || amount <= 0) {
    return {
      status: 400,
      message: "Invalid amount. Please provide a positive number.",
    };
  }

  const amountInCents = Math.round(parseFloat(amount) * 100);
  if (amountInCents < MINIMUM_AMOUNT_CENTS) {
    return { status: 400, message: "Amount must be at least $0.50 USD." };
  }

  return { amountInCents }; // Return validated amount in cents
};

/**
 * Creates a Stripe PaymentIntent
 * @param {number} amountInCents - Amount in cents
 * @returns {Promise<object>} - Stripe PaymentIntent object
 */
const createStripePaymentIntent = async (amountInCents) => {
  return stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    payment_method_types: ["card"],
  });
};

// Route to handle PaymentIntent creation
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body;

    // Validate the payment amount
    const validation = validatePaymentAmount(amount);
    if (validation.status) {
      return res.status(validation.status).json({ error: validation.message });
    }

    // Create PaymentIntent with validated amount
    const paymentIntent = await createStripePaymentIntent(
      validation.amountInCents
    );

    // Send successful response with PaymentIntent details
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: amount,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    // Log and return error details
    console.error("PaymentIntent creation error:", error.message);
    res.status(500).json({
      error: "Failed to create PaymentIntent",
      details: error.message,
    });
  }
});

// Start the server
const port = process.env.PORT || DEFAULT_PORT;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
