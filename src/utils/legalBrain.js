import { OFFICIAL_LEGAL_DATA } from '../data/legalData';

// Safety keywords to block
const UNSAFE_KEYWORDS = [
    "bomb", "explosive", "terror", "kill someone", "murder someone",
    "suicide", "harm myself", "generate malware", "hack bank",
    "child porn", "drug synthesis"
];

export const checkSafety = (query) => {
    const lowerQuery = query.toLowerCase();
    for (const word of UNSAFE_KEYWORDS) {
        if (lowerQuery.includes(word)) {
            return {
                safe: false,
                message: "⚠️ I cannot assist with this request. It violates safety guidelines or pertains to illegal activities causing harm. If you are in immediate danger, please contact emergency services (112)."
            };
        }
    }
    return { safe: true };
};

export const localAnalyzeQuery = (query, history) => {
    // 1. Context Awareness
    let searchContext = query;

    // Check if we need context from previous messages
    const contextTriggers = [
        "it", "this", "that", "he", "she", "they", "him", "her",
        "evidence", "report", "punishment", "penalty", "fine", "jail", "prison",
        "what", "how", "why", "and", "about", "time", "cost", "fee", "procedure"
    ];
    const lowerQuery = query.toLowerCase();

    // Check if any trigger word is present in the query (handling punctuation)
    const needsContext = contextTriggers.some(trigger =>
        new RegExp(`\\b${trigger}\\b`, 'i').test(lowerQuery) || // Whole word match
        lowerQuery.includes(trigger) // Fallback for some cases
    );

    if (needsContext && history.length > 0) {
        // Append the last user message to the current query for better context
        const lastUserMessage = [...history].reverse().find(msg => msg.role === 'user');
        if (lastUserMessage) {
            searchContext = `${lastUserMessage.content} ${query}`;
        }
    }

    // 2. Search Logic
    const searchTerms = searchContext.toLowerCase().split(' ').filter(word => word.length > 3); // Filter small words

    const results = OFFICIAL_LEGAL_DATA.map(entry => {
        let score = 0;

        // Check keywords
        entry.keywords.forEach(keyword => {
            if (searchContext.toLowerCase().includes(keyword.toLowerCase())) {
                score += 5;
            }
        });

        // Check title and text
        searchTerms.forEach(term => {
            if (entry.title.toLowerCase().includes(term)) score += 2;
            if (entry.text.toLowerCase().includes(term)) score += 1;
        });

        return { ...entry, score };
    })
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3); // Top 3 results

    // Mock Case Laws Database (In a real app, this would be a separate search)
    const CASE_LAWS = {
        "privacy": ["K.S. Puttaswamy v. Union of India (2017)", "R. Rajagopal v. State of Tamil Nadu (1994)"],
        "cyber": ["Shreya Singhal v. Union of India (2015)", "Avnish Bajaj v. State (NCT) of Delhi (2005)"],
        "murder": ["K.M. Nanavati v. State of Maharashtra (1961)", "Bachan Singh v. State of Punjab (1980)"],
        "theft": ["Pyare Lal Bhargava v. State of Maharashtra (1963)"],
        "sexual": ["Vishaka v. State of Rajasthan (1997)", "Independent Thought v. Union of India (2017)"],
        "consumer": ["Indian Medical Association v. V.P. Shantha (1995)"],
        "driving": ["S. Rajaseekaran v. Union of India (2014)"],
        "property": ["Suraj Lamp & Industries Pvt. Ltd. v. State of Haryana (2011)"],
        "military": ["Union of India v. Major General Madan Lal Yadav (1996)"],
        "army": ["Union of India v. Major General Madan Lal Yadav (1996)"]
    };

    // Attach relevant case laws to results
    const enrichedResults = results.map(result => {
        let relevantCases = [];
        for (const [key, cases] of Object.entries(CASE_LAWS)) {
            if (result.keywords.some(k => k.toLowerCase().includes(key)) || result.title.toLowerCase().includes(key)) {
                relevantCases = [...relevantCases, ...cases];
            }
        }
        return { ...result, caseLaws: [...new Set(relevantCases)] }; // Remove duplicates
    });

    // 3. Fallback Logic
    if (enrichedResults.length === 0) {
        const isCyberRelated = searchContext.toLowerCase().includes("cyber") || searchContext.toLowerCase().includes("internet") || searchContext.toLowerCase().includes("online");

        return {
            contextUsed: searchContext !== query,
            results: [{
                id: 'external_search',
                source: isCyberRelated ? 'Cyber Law Database & India Code' : 'India Code (Official Repository)',
                section: 'External Search',
                title: 'Search Full Database',
                text: `I couldn't find a specific match in my local cache for "${searchContext}". ${isCyberRelated ? "Since this appears to be a cyber law matter, I recommend searching broader databases as some specific regulations might not be in India Code." : "You can search the comprehensive India Code repository."}`,
                keywords: [],
                remedy: 'External Database Search',
                steps: ['Click the links below to open search results.'],
                isExternal: true,
                externalUrls: [
                    { label: "Search India Code", url: `https://www.indiacode.nic.in/search?query=${encodeURIComponent(searchContext)}` },
                    { label: "Search Google (Case Laws)", url: `https://www.google.com/search?q=${encodeURIComponent(searchContext + " indian supreme court judgments")}` }
                ]
            }]
        };
    }

    return {
        contextUsed: searchContext !== query,
        results: enrichedResults
    };
};

export const analyzeQuery = async (query, history) => {
    try {
        // Try Cloud API first
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [...history, { role: 'user', content: query }] })
        });

        if (!response.ok) throw new Error('API Error');

        const data = await response.json();

        // Return in a format compatible with App.jsx
        return {
            contextUsed: true,
            isCloud: true,
            results: [{
                id: 'cloud_response',
                source: 'NyayaSahayak AI (Cloud)',
                section: 'Expert Advice',
                title: 'Legal Consultation',
                text: data.content,
                remedy: '',
                steps: [],
                evidence: []
            }]
        };

    } catch (error) {
        console.warn("Cloud API failed:", error);
        // Fallback to local brain, but append a debug message
        const localResult = localAnalyzeQuery(query, history);
        return {
            ...localResult,
            results: [{
                ...localResult.results[0],
                text: `[CLOUD ERROR: ${error.message}] Falling back to local database...\n\n${localResult.results[0].text}`
            }]
        };
    }
};
