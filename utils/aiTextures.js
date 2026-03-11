import { GoogleGenAI } from "@google/genai";

export async function generateAITextures() {
    // Use the selected API key if available, otherwise fallback to the default GEMINI_API_KEY
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey });

    // We'll generate a single sprite sheet with all textures to be efficient
    const prompt = "A 256x256 pixel art sprite sheet for a voxel game. It should be a 4x4 grid of 64x64 textures. The textures MUST include: 1. Lush Green Grass Top, 2. Rich Brown Dirt, 3. Rugged Grey Stone, 4. Fine Yellow Sand, 5. Tree Bark (Wood), 6. Dense Green Leaves, 7. Clear Blue Water, 8. Pure White Snow, 9. Dark Bedrock, 10. Wooden Planks, 11. Rough Cobblestone, 12. Grass Side (top green, bottom brown), 13. Transparent Glass, 14. Grey Gravel. Style: Vibrant, clean, tileable pixel art.";
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [{ text: prompt }],
            config: {
                imageConfig: {
                    aspectRatio: "1:1"
                }
            }
        });

        let base64 = null;
        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    base64 = part.inlineData.data;
                    break;
                }
            }
        }

        if (!base64) {
            // Check if it's a permission error in the response text or status
            const text = response.text || "";
            if (text.toLowerCase().includes("permission") || text.toLowerCase().includes("403")) {
                throw new Error("PERMISSION_DENIED");
            }
            throw new Error("No image data in response");
        }

        return { spriteSheet: base64 };
    } catch (error) {
        console.error("Failed to generate AI textures:", error);
        // Re-throw if it's a permission error so the UI can handle it
        if (error.message?.includes("403") || error.message?.includes("permission")) {
            throw error;
        }
        return null;
    }
}
