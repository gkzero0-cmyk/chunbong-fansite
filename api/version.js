module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({
    sha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.DEPLOY_COMMIT_SHA || '',
    ref: process.env.VERCEL_GIT_COMMIT_REF || '',
    environment: process.env.VERCEL_ENV || '',
    deploymentUrl: process.env.VERCEL_URL || ''
  });
};
