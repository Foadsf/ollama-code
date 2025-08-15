import { setConfig } from '../config.js';

export const SECURITY_PROFILES = {
    strict: {
        name: 'Strict',
        description: 'Maximum security - only safe operations allowed',
        settings: {
            bashTool: { enabled: true, profile: 'strict' },
            fileTools: { enabled: true, profile: 'strict' },
            gitTool: { enabled: true, restrictive: true },
            autoApproval: false,
            auditLogging: true,
            networkAccess: false
        }
    },
    moderate: {
        name: 'Moderate',
        description: 'Balanced security and functionality',
        settings: {
            bashTool: { enabled: true, profile: 'moderate' },
            fileTools: { enabled: true, profile: 'moderate' },
            gitTool: { enabled: true, restrictive: false },
            autoApproval: false,
            auditLogging: true,
            networkAccess: true
        }
    },
    permissive: {
        name: 'Permissive',
        description: 'Minimal restrictions - use with caution',
        settings: {
            bashTool: { enabled: true, profile: 'permissive' },
            fileTools: { enabled: true, profile: 'permissive' },
            gitTool: { enabled: true, restrictive: false },
            autoApproval: true,
            auditLogging: true,
            networkAccess: true
        }
    }
};

export function getSecurityProfile(profileName = 'moderate') {
    return SECURITY_PROFILES[profileName] || SECURITY_PROFILES.moderate;
}

export function setSecurityProfile(profileName) {
    if (!SECURITY_PROFILES[profileName]) {
        throw new Error(`Unknown security profile: ${profileName}`);
    }

    const profile = SECURITY_PROFILES[profileName];

    // Update configuration
    setConfig('securityProfile', profileName);
    setConfig('bashToolProfile', profile.settings.bashTool.profile);
    setConfig('fileToolProfile', profile.settings.fileTools.profile);
    setConfig('auditLogging', profile.settings.auditLogging);
    setConfig('autoApproval', profile.settings.autoApproval);

    return profile;
}
