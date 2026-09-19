import { listDocuments } from '#lib/server/documents.js';
import type { PageServerLoad } from './$types';

/** Supply the catalog without sending the source corpus to the browser. */
export const load: PageServerLoad = () => ({ documents: listDocuments() });
