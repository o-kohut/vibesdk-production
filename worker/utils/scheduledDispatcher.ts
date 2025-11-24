import { createLogger } from '../logger';
import { drizzle } from 'drizzle-orm/d1';
import { apps } from '../database/schema';
import { isNotNull } from 'drizzle-orm';
import { isDispatcherAvailable } from './dispatcherUtils';

const logger = createLogger('ScheduledDispatcher');

/**
 * Dispatches scheduled events to all deployed user applications.
 * Iterates through all apps with deploymentId and dispatches the scheduled event
 * to their /__scheduled endpoint via the dispatch namespace.
 * 
 * @param cronExpression The cron expression (e.g., "0 * * * *")
 * @param env The environment bindings.
 */
export async function dispatchScheduledToApps(cronExpression: string, env: Env): Promise<void> {
	logger.info(`Handling scheduled event for user apps: ${cronExpression}`);

	if (!isDispatcherAvailable(env)) {
		logger.warn('Dispatcher not available, cannot dispatch scheduled events');
		return;
	}

	try {
		// Get all deployed apps from database
		const db = drizzle(env.DB);
		const deployedApps = await db
			.select({
				deploymentId: apps.deploymentId,
			})
			.from(apps)
			.where(isNotNull(apps.deploymentId))
			.all();

		logger.info(`Found ${deployedApps.length} deployed apps for scheduled event`);

		const dispatcher = env.DISPATCHER;
		
		// Convert cron expression to URL format (spaces to +)
		const cronParam = cronExpression.replace(/ /g, '+');

		// Dispatch to all apps in parallel
		const promises = deployedApps.map(async (app) => {
			if (!app.deploymentId) return;

			try {
				const worker = dispatcher.get(app.deploymentId);
				
				// Create abort controller with 15 minute timeout
				const timeoutMs = 15 * 60 * 1000; // 15 minutes
				const abortController = new AbortController();
				const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

				// Dispatch scheduled event to user app
				const scheduledRequest = new Request(
					`https://${app.deploymentId}.${env.CUSTOM_DOMAIN}/__scheduled?cron=${cronParam}`,
					{
						method: 'GET',
						headers: {
							'X-Cloudflare-Scheduled-Secret': env.SCHEDULED_SECRET,
						},
						signal: abortController.signal,
					}
				);

				const response = await worker.fetch(scheduledRequest);
				clearTimeout(timeoutId);
				
				if (response.ok) {
					logger.info(`Scheduled event dispatched successfully to '${app.deploymentId}'`);
				} else if (response.status === 404) {
					// App doesn't have scheduled handler, that's ok
					logger.debug(`App '${app.deploymentId}' has no scheduled handler`);
				} else {
					logger.warn(`Scheduled event failed for '${app.deploymentId}': ${response.status}`);
				}
			} catch (error: any) {
				if (error.name === 'AbortError') {
					logger.warn(`Scheduled event timeout for '${app.deploymentId}' (exceeded 15 minutes)`);
				} else {
					logger.error(`Error dispatching scheduled event to '${app.deploymentId}': ${error.message}`);
				}
			}
		});

		// Wait for all promises to complete
		await Promise.allSettled(promises);

		logger.info(`Scheduled event dispatched to ${deployedApps.length} apps`);
	} catch (error: any) {
		logger.error(`Fatal error in dispatchScheduledToApps: ${error.message}`);
	}
}

