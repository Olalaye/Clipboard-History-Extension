// lib/classifier.js
const categorize = (text) => {
    const patterns = {
      code: /(function|class|import|console\.log)/,
      link: /https?:\/\/\S+/,
      email: /\S+@\S+\.\S+/,
      image: /\.(png|jpg|jpeg|gif|webp)$/i
    };
  
    return Object.entries(patterns).find(
      ([_, pattern]) => pattern.test(text)
    )?.[0] || 'text';
  };