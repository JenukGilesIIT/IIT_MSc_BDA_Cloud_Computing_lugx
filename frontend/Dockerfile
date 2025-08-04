# Multi-stage build for optimized production image
FROM nginx:alpine

# Set maintainer information
LABEL maintainer="CMM707 Student <student@iit.ac.lk>"
LABEL description="LUGX Gaming Platform Frontend"
LABEL version="1.0"

# Create non-root user for security
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S -D -H -u 1001 -s /sbin/nologin -G nginx-user -g nginx-user nginx-user

# Copy static files to nginx html directory
COPY --chown=nginx-user:nginx-user index.html /usr/share/nginx/html/
COPY --chown=nginx-user:nginx-user *.html /usr/share/nginx/html/
COPY --chown=nginx-user:nginx-user assets/ /usr/share/nginx/html/assets/
COPY --chown=nginx-user:nginx-user vendor/ /usr/share/nginx/html/vendor/

# Copy custom nginx configuration
COPY --chown=nginx-user:nginx-user nginx.conf /etc/nginx/nginx.conf

# Set proper permissions
RUN chown -R nginx-user:nginx-user /usr/share/nginx/html && \
    chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /var/log/nginx && \
    chown -R nginx-user:nginx-user /etc/nginx/conf.d

# Create directories nginx needs and set permissions
RUN touch /var/run/nginx.pid && \
    chown -R nginx-user:nginx-user /var/run/nginx.pid

# Switch to non-root user
USER nginx-user

# Expose port 8080 (non-privileged port)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
