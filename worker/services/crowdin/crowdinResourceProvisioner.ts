/**
 * Crowdin Resource Provisioner
 * Handles provisioning of Crowdin OAuth clients for user applications
 */

import { StructuredLogger } from '../../logger';
import { CrowdinOAuthManager } from './crowdinOAuthManager';
import { createDatabaseService } from '../../database/database';
import * as schema from '../../database/schema';
import { eq } from 'drizzle-orm';

export interface CrowdinOAuthProvisionSuccess {
    success: true;
    clientId: string;
    clientSecret: string;
}

export interface CrowdinOAuthProvisionError {
    success: false;
    error: string;
}

export type CrowdinOAuthProvisionResult = CrowdinOAuthProvisionSuccess | CrowdinOAuthProvisionError;

export class CrowdinResourceProvisioner {
    private logger: StructuredLogger;
    private env: Env;
    private userId: string;
    private crowdinOAuthManager?: CrowdinOAuthManager;

    constructor(logger: StructuredLogger, env: Env, userId: string) {
        this.logger = logger;
        this.env = env;
        this.userId = userId;
        this.crowdinOAuthManager = new CrowdinOAuthManager(logger, env);
        this.logger.info('CrowdinResourceProvisioner initialized successfully', { userId: this.userId });
    }

    /**
     * Get Crowdin user data from database
     */
    private async getCrowdinUserData(): Promise<{ userId: number; domain: string | null } | null> {
        try {
            const dbService = createDatabaseService(this.env);
            const user = await dbService.db
                .select({
                    providerId: schema.users.providerId,
                    providerData: schema.users.providerData,
                    provider: schema.users.provider
                })
                .from(schema.users)
                .where(eq(schema.users.id, this.userId))
                .get();
            
            if (user && user.provider === 'crowdin') {
                const userId = Number(user.providerId);
                const domain = user.providerData ? (user.providerData as any).domain : null;
                this.logger.info('Crowdin user data retrieved', { 
                    userId, 
                    domain
                });
                return {
                    userId,
                    domain
                };
            }
            
            this.logger.warn('User is not authenticated with Crowdin', { userId: this.userId });
            return null;
        } catch (error) {
            this.logger.warn('Failed to fetch Crowdin user data', error);
            return null;
        }
    }

    /**
     * Create OAuth client for user application
     */
    async createOAuthClient(
        clientName: string,
        redirectUrl: string
    ): Promise<CrowdinOAuthProvisionResult> {
        try {
            // Get Crowdin user data from database
            const crowdinUserData = await this.getCrowdinUserData();
            
            if (!crowdinUserData) {
                this.logger.warn('Crowdin user data not available for OAuth client creation');
                return {
                    success: false,
                    error: 'User is not authenticated with Crowdin or userId not provided'
                };
            }

            if (!this.crowdinOAuthManager) {
                this.logger.error('CrowdinOAuthManager not initialized');
                return {
                    success: false,
                    error: 'CROWDIN_OAUTH_MANAGER_CLIENT_ID and CROWDIN_OAUTH_MANAGER_CLIENT_SECRET must be configured'
                };
            }

            this.logger.info(`Creating Crowdin OAuth client: ${clientName}`);
            
            const result = await this.crowdinOAuthManager.createOAuthClient({
                name: clientName,
                redirect: redirectUrl,
                userId: crowdinUserData.userId,
                domain: crowdinUserData.domain
            });

            if (!result.success) {
                this.logger.error('Failed to create Crowdin OAuth client', result.error);
                return {
                    success: false,
                    error: result.error
                };
            }

            this.logger.info(`Successfully created Crowdin OAuth client: ${result.clientId}`, {
                clientName,
                redirectUrl
            });

            return {
                success: true,
                clientId: result.clientId,
                clientSecret: result.clientSecret
            };
        } catch (error) {
            this.logger.error('Exception while creating Crowdin OAuth client', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

