import { Resend } from 'resend';

/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Queue consumer: a Worker that can consume from a
 * Queue: https://developers.cloudflare.com/queues/get-started/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async queue(batch, env) {
		for (const message of batch.messages) {
			const application = message.body;
			const email = application.email;
			const companyName = application.companyName.toLowerCase();

			// Try to fetch the value from the KV CompaniesKV, using the companyName as key.
			const companyValue = await env.CompaniesKV.get(companyName);
			if (companyValue) {
				const companyEmailAddress = JSON.parse(companyValue).email;
				try {
					const resend = new Resend(env.RESEND_API_KEY);
					const sentEmail = await resend.emails.send({
						from: 'Genius <noreply@nutzy.nl>',
						to: [companyEmailAddress],
						subject: 'Nieuwe sollicitatie',
						html: `
						<p>Er is een nieuwe sollicitatie binnengekomen!</p>
						<p>Naam: ${application.name}</p>
						<p>Email: ${application.email}</p>
						<p>Telefoonnummer: ${application.phone}</p>
					`,
					});
					console.log(sentEmail);
				} catch (error) {
					console.error('Error processing message:', error);
				}
			}

			try {
				const existingValue = await env.ApplicationsKV.get(email);
				let existingApplications;
				if (existingValue) {
					existingApplications = JSON.parse(existingValue);
				} else {
					existingApplications = [];
				}
				existingApplications.push(application);
				await env.ApplicationsKV.put(email, JSON.stringify(existingApplications));
			} catch (error) {
				console.error('Error processing message:', error);
				// TODO: Re-queue or send to failure queue based on your chosen approach
				return Promise.reject(error);
			}
		}
		return Promise.resolve(); // Indicate successful processing of all messages
	},
};
