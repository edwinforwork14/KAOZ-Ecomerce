const { prisma } = require("../config/database");
const { execSync } = require("child_process");

const registerDeployment = async (version, environment = "production") => {
  try {
    let deployment = await prisma.deployment.findUnique({
      where: { version }
    });

    if (!deployment) {
      let commitMessage = '';
      try {
        commitMessage = execSync("git log -1 --pretty=%B").toString().trim();
      } catch (gitError) {
        console.log("⚠️ No se pudo obtener información de git");
      }

      deployment = await prisma.deployment.create({
        data: {
          version,
          environment,
          deployedAt: new Date(),
          isActive: true,
          name: `Deploy ${new Date().toISOString().split('T')[0]} ${version.substring(0, 8)}`,
          description: commitMessage || 'Auto-deployment',
        }
      });
    }
    return deployment;
  } catch (error) {
    console.error("❌ Error al registrar implementación:", error.message);
    return null;
  }
};

const getActiveDeployment = async () => {
  return await prisma.deployment.findFirst({
    where: { isActive: true },
    orderBy: { deployedAt: 'desc' }
  });
};

const toggleDeployment = async (id, isActive) => {
  return await prisma.deployment.update({
    where: { id },
    data: { isActive }
  });
};

module.exports = { registerDeployment, getActiveDeployment, toggleDeployment };
