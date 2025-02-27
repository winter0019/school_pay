exports.handler = async (event, context) => {
  // Example proxy function. Use this to securely fetch data from an API if needed.
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from Binge Winter0019 proxy!" })
  };
};
