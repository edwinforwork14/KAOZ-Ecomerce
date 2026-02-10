const generateSKU = (productName, color, size) => {
  const prefix = productName.substring(0, 3).toUpperCase();
  const colorCode = color.substring(0, 2).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${colorCode}-${size}-${timestamp}`;
};

const formatPrice = (price) => {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
  }).format(price);
};

const formatDate = (date) => {
  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

module.exports = {
  generateSKU,
  formatPrice,
  formatDate,
};
