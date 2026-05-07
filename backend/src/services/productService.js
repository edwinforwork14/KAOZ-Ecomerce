const { prisma } = require("../config/database");

const updateNewStatus = async (globalDurationDays = 30) => {
  try {
    const now = new Date();
    
    const newProducts = await prisma.product.findMany({
      where: {
        isNew: true,
        markedAsNewAt: { not: null }
      }
    });

    let updatedCount = 0;

    for (const product of newProducts) {
      const durationDays = product.newDurationDays || globalDurationDays;
      const expirationDate = new Date(product.markedAsNewAt);
      expirationDate.setDate(expirationDate.getDate() + durationDays);

      if (now >= expirationDate) {
        await prisma.product.update({
          where: { id: product.id },
          data: { isNew: false }
        });
        updatedCount++;
      }
    }

    return { updated: updatedCount };
  } catch (error) {
    console.error("❌ Error al actualizar estado 'isNew' en Prisma:", error.message);
    return { updated: 0 };
  }
};

module.exports = { updateNewStatus };
