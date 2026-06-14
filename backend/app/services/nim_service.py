import logging
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger("companybrain.nim")

class NIMClient:
    def __init__(self):
        self.nvidia_key = settings.NVIDIA_API_KEY
        self.is_nvidia_active = self.nvidia_key and not self.nvidia_key.startswith("mock")
        
        # Initialize NVIDIA NIM Client
        if self.is_nvidia_active:
            logger.info("Initializing NVIDIA NIM LLM client")
            self.client = OpenAI(
                base_url="https://integrate.api.nvidia.com/v1",
                api_key=self.nvidia_key
            )
        else:
            self.client = None
            logger.warning("NVIDIA NIM API key is missing.")

    def generate_answer(self, query: str, context: str) -> str:
        """
        Sends the retrieved context and user query to NVIDIA NIM for answer synthesis.
        """
        system_prompt = (
            "You are the Company Brain, a central intelligence and shared memory agent for the company.\n"
            "Answer the employee's query based ONLY on the provided context. The context is retrieved from the "
            "Company Knowledge Graph, Semantic Vector Store, and Chronological Timeline.\n"
            "Be precise, professional, and clear. If the context does not contain the answer, explain what context "
            "is available and suggest what documents or entities might have the answer."
        )
        
        user_prompt = f"### Retrieved Context:\n{context}\n\n### User Question:\n{query}\n\n### Response:"
        
        # 1. Try NVIDIA NIM
        if self.is_nvidia_active and self.client:
            try:
                response = self.client.chat.completions.create(
                    model=settings.NVIDIA_NIM_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.2,
                    max_tokens=1024
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.error(f"NVIDIA NIM Chat API call failed: {e}")

        # 2. Local summary fallback if NVIDIA NIM fails
        return self._generate_local_answer(query, context)

    def _generate_local_answer(self, query: str, context: str) -> str:
        """
        A heuristic-based local generator that extracts key facts from the context to form a readable answer.
        This allows the app to be fully functional, showcasing the RAG retrieval quality even when LLM endpoints are down.
        """
        lines = [line.strip() for line in context.split("\n") if line.strip()]
        
        # Build a response summarizing what was retrieved
        res = f"**Answer synthesized from retrieved knowledge (AI LLM not connected - configurable in .env):**\n\n"
        res += f"I processed your question: *\"{query}\"* against the company storage.\n\n"
        
        if not lines:
            res += "No relevant documents, relationships, or timeline logs were found for this query in the Company Brain databases."
            return res
            
        res += "Here is the information retrieved from the databases:\n\n"
        
        semantic_facts = []
        graph_facts = []
        timeline_facts = []
        
        for line in lines:
            if line.startswith("- [Semantic]"):
                semantic_facts.append(line.replace("- [Semantic] ", ""))
            elif line.startswith("- [Graph]"):
                graph_facts.append(line.replace("- [Graph] ", ""))
            elif line.startswith("- [Timeline]"):
                timeline_facts.append(line.replace("- [Timeline] ", ""))
        
        if semantic_facts:
            res += "**From Document Content Search (Semantic):**\n"
            for fact in semantic_facts[:3]:
                res += f"* ...{fact}...\n"
            res += "\n"
            
        if graph_facts:
            res += "**From Knowledge Graph Connections:**\n"
            for fact in graph_facts[:3]:
                res += f"* {fact}\n"
            res += "\n"
            
        if timeline_facts:
            res += "**From Chronological Events:**\n"
            for fact in timeline_facts[:3]:
                res += f"* {fact}\n"
            res += "\n"
            
        res += "*(Note: To generate full AI-synthesized responses, configure a valid `NVIDIA_API_KEY` in `.env`.)*"
        return res

nim_client = NIMClient()
