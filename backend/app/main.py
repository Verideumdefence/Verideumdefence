from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.migrations import apply_schema_updates
from app.db.session import engine
from app.services.scheduler import start_scheduler

settings = get_settings()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


def create_app() -> FastAPI:
    Base.metadata.create_all(bind=engine)
    apply_schema_updates(engine)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        start_scheduler()
        yield
        from app.services.scheduler import stop_scheduler

        stop_scheduler()

    app = FastAPI(
            title=settings.project_name,
            version="0.1.0",
            lifespan=lifespan,
            docs_url=None if settings.environment.lower() == "production" else "/docs",
            redoc_url=None if settings.environment.lower() == "production" else "/redoc",
            openapi_url=None if settings.environment.lower() == "production" else "/openapi.json",
        )
    
    # Add rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/health", tags=["system"])
    @limiter.limit("100/minute")
    def health(request: Request) -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
