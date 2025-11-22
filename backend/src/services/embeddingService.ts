import { pipeline, env } from '@xenova/transformers';

// Disable local model caching to .cache folder - use temp instead
env.cacheDir = '/tmp/transformers-cache';

class EmbeddingService {
    private static instance: EmbeddingService;
    private embedder: any = null;
    private modelName = 'Xenova/all-MiniLM-L6-v2';
    private isLoading = false;
    private loadingPromise: Promise<void> | null = null;

    private constructor() { }

    public static getInstance(): EmbeddingService {
        if (!EmbeddingService.instance) {
            EmbeddingService.instance = new EmbeddingService();
        }
        return EmbeddingService.instance;
    }

    /**
     * Initialize the embedding model (lazy loading)
     */
    private async loadModel(): Promise<void> {
        if (this.embedder) {
            return; // Already loaded
        }

        if (this.isLoading && this.loadingPromise) {
            // Already loading, wait for it
            return this.loadingPromise;
        }

        this.isLoading = true;
        this.loadingPromise = (async () => {
            try {
                console.log('🔄 Loading embedding model:', this.modelName);
                console.log('   This may take a moment on first run (~25MB download)...');

                this.embedder = await pipeline('feature-extraction', this.modelName);

                console.log('✅ Embedding model loaded successfully');
            } catch (error) {
                console.error('❌ Failed to load embedding model:', error);
                throw new Error('Failed to initialize embedding model');
            } finally {
                this.isLoading = false;
            }
        })();

        return this.loadingPromise;
    }

    /**
     * Generate embedding for a single text
     */
    async generateEmbedding(text: string): Promise<number[]> {
        await this.loadModel();

        try {
            const output = await this.embedder(text, {
                pooling: 'mean',
                normalize: true,
            });

            // Convert tensor to array
            return Array.from(output.data);
        } catch (error) {
            console.error('Failed to generate embedding:', error);
            throw new Error('Embedding generation failed');
        }
    }

    /**
     * Generate embeddings for multiple texts (batch processing)
     */
    async generateEmbeddings(texts: string[]): Promise<number[][]> {
        await this.loadModel();

        try {
            const embeddings: number[][] = [];

            // Process in batches to avoid memory issues
            const batchSize = 10;
            for (let i = 0; i < texts.length; i += batchSize) {
                const batch = texts.slice(i, i + batchSize);
                const batchResults = await Promise.all(
                    batch.map(text => this.generateEmbedding(text))
                );
                embeddings.push(...batchResults);
            }

            return embeddings;
        } catch (error) {
            console.error('Failed to generate embeddings:', error);
            throw new Error('Batch embedding generation failed');
        }
    }

    /**
     * Get embedding dimension
     */
    getDimension(): number {
        return 384; // all-MiniLM-L6-v2 produces 384-dimensional vectors
    }
}

// Export singleton instance
export default EmbeddingService.getInstance();
