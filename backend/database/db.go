package database

import (
	"log"
	"memepump/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect(dsn string) {
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Connected to Database")

	// Auto Migrate - including new WalletLink model
	err = DB.AutoMigrate(
		&models.Coin{},
		&models.Trade{},
		&models.Comment{},
		&models.User{},
		&models.WalletLink{},
	)
	if err != nil {
		log.Fatal("Failed to auto migrate:", err)
	}
	log.Println("Database Migration Completed")
}
