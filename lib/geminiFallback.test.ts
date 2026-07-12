import { describe, expect, it, vi } from "vitest";
import {
  generateContentWithFallback,
  GeminiModelFallbackError,
} from "@/lib/geminiFallback";

function fakeGemini(generateContent: ReturnType<typeof vi.fn>) {
  return {
    models: {
      generateContent,
    },
  } as never;
}

describe("Gemini model fallback", () => {
  it("tries the next model when the preferred Gemini model fails", async () => {
    const generateContent = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("model unavailable"), { status: 503 }))
      .mockResolvedValueOnce({ text: "{\"ok\":true}" });

    const result = await generateContentWithFallback(fakeGemini(generateContent), {
      contents: [{ role: "user", parts: [{ text: "scan this" }] }],
    });

    expect(result.model).toBe("gemini-2.5-flash");
    expect(result.attemptedModels).toEqual(["gemini-3.5-flash", "gemini-2.5-flash"]);
    expect(result.failedAttempts[0]).toMatchObject({
      model: "gemini-3.5-flash",
      geminiStatus: 503,
    });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("stops immediately when Gemini rejects credentials", async () => {
    const generateContent = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("API key invalid"), { status: 403 }));

    await expect(
      generateContentWithFallback(fakeGemini(generateContent), {
        contents: [{ role: "user", parts: [{ text: "scan this" }] }],
      })
    ).rejects.toBeInstanceOf(GeminiModelFallbackError);

    expect(generateContent).toHaveBeenCalledTimes(1);
  });
});
