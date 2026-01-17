export default function handler(req, res) {
  res.status(200).json({ 
    message: "Server is online!", 
    time: new Date().toISOString() 
  });
}
