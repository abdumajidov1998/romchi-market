# Default Dockerfile builds the backend so a single-image deploy keeps
# working out of the box. Each module also has its own Dockerfile —
# prefer those (`backend-java/Dockerfile`, `frontend/Dockerfile`) when
# deploying the two services separately, e.g. via render.yaml below.
FROM eclipse-temurin:25-jdk AS build
WORKDIR /src
COPY backend-java/.mvn .mvn
COPY backend-java/mvnw backend-java/pom.xml ./
RUN ./mvnw -q -DskipTests dependency:go-offline
COPY backend-java/src ./src
RUN ./mvnw -q -DskipTests package -B && cp target/*.jar /app.jar

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app.jar /app/app.jar
ENV PORT=3001 SPRING_PROFILES_ACTIVE=prod UPLOAD_DIR=/app/uploads
EXPOSE 3001
CMD ["java", "-jar", "/app/app.jar"]
