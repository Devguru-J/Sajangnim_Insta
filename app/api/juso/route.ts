import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("keyword");
    const currentPage = searchParams.get("currentPage") || "1";
    const countPerPage = searchParams.get("countPerPage") || "10";

    if (!keyword) {
        return NextResponse.json({ results: { common: { errorCode: "-1", errorMessage: "Keyword is required" }, juso: [] } }, { status: 400 });
    }

    const apiKey = process.env.JUSO_API_KEY || "";
    const apiUrl = "https://business.juso.go.kr/addrlink/addrLinkApi.do";

    try {
        const params = new URLSearchParams({
            confmKey: apiKey,
            currentPage: currentPage,
            countPerPage: countPerPage,
            keyword: keyword,
            resultType: "json",
        });

        const response = await fetch(`${apiUrl}?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Address API Error:", error);
        return NextResponse.json({ error: "Failed to fetch address" }, { status: 500 });
    }
}
