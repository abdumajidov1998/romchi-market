FROM eclipse-temurin:25-jdk AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -q -DskipTests dependency:go-offline
COPY src ./src
RUN ./mvnw -q -DskipTests package -B && cp target/*.jar /app.jar

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app.jar /app/app.jar
ENV PORT=3001 SPRING_PROFILES_ACTIVE=prod UPLOAD_DIR=/app/uploads
EXPOSE 3001
CMD ["java", "-jar", "/app/app.jar"]
