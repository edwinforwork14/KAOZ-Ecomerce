const mongoose = require("mongoose");
const { execSync } = require("child_process");

const deploymentSchema = new mongoose.Schema(
  {
    version: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deployedAt: {
      type: Date,
      default: Date.now,
    },
    environment: {
      type: String,
      enum: ["development", "staging", "production"],
      default: "production",
    },
    description: String,
    name: {
      type: String,
      default: function() {
        // Generar nombre basado en fecha y versión corta
        const date = new Date();
        const shortVersion = this.version ? this.version.substring(0, 8) : 'unknown';
        return `Deploy ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${shortVersion}`;
      }
    },
    url: {
      type: String,
      default: function() {
        // URL por defecto basada en entorno
        const baseUrls = {
          production: 'https://yenfit.shop',
          staging: 'https://staging.yenfit.shop',
          development: 'http://localhost:3000'
        };
        return baseUrls[this.environment] || baseUrls.production;
      }
    },
    branch: {
      type: String,
      default: 'main'
    },
    commitMessage: String,
    deployedBy: {
      type: String,
      default: 'auto'
    },
  },
  {
    timestamps: true,
  }
);

deploymentSchema.statics.registerDeployment = async function (version, environment = "production") {
  try {
    let deployment = await this.findOne({ version });
    if (!deployment) {
      // Obtener información adicional de git
      let branch = 'main';
      let commitMessage = '';
      try {
        branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
        commitMessage = execSync("git log -1 --pretty=%B").toString().trim();
      } catch (gitError) {
        console.log("⚠️ No se pudo obtener información de git, usando valores por defecto");
      }

      deployment = await this.create({
        version,
        environment,
        deployedAt: new Date(),
        isActive: true, // Asegurar que sea activa por defecto
        branch,
        commitMessage,
        deployedBy: process.env.USER || process.env.USERNAME || 'auto',
      });
      console.log(`✅ Nueva implementación registrada: ${version}`);
    } else {
      // Actualizar información si falta
      let needsUpdate = false;
      if (!deployment.branch || !deployment.commitMessage || !deployment.name) {
        needsUpdate = true;
        try {
          if (!deployment.branch) {
            deployment.branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
          }
          if (!deployment.commitMessage) {
            deployment.commitMessage = execSync("git log -1 --pretty=%B").toString().trim();
          }
          if (!deployment.name) {
            const date = new Date(deployment.deployedAt || new Date());
            const shortVersion = deployment.version ? deployment.version.substring(0, 8) : 'unknown';
            deployment.name = `Deploy ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${shortVersion}`;
          }
          await deployment.save();
          console.log(`📝 Implementación actualizada con nueva información: ${version}`);
        } catch (gitError) {
          console.log("⚠️ No se pudo actualizar información de git");
        }
      }

      if (!needsUpdate) {
        console.log(`ℹ️ Implementación ya existe: ${version}`);
      }
    }
    return deployment;
  } catch (error) {
    console.error("❌ Error al registrar implementación:", error.message);
    throw error;
  }
};

deploymentSchema.statics.getActiveDeployment = async function () {
  return await this.findOne({ isActive: true }).sort({ deployedAt: -1 });
};

deploymentSchema.statics.toggleDeployment = async function (id, isActive) {
  return await this.findByIdAndUpdate(id, { isActive }, { new: true });
};

module.exports = mongoose.model("Deployment", deploymentSchema);